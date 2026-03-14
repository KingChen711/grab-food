import { Client } from '@elastic/elasticsearch'
import type { SortCombinations } from '@elastic/elasticsearch/lib/api/types'
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'

import type { AutocompleteDto } from './dto/autocomplete.dto'
import type { SearchMenuItemsDto } from './dto/search-menu-items.dto'
import type { SearchRestaurantsDto } from './dto/search-restaurants.dto'

export const ELASTICSEARCH_CLIENT = 'ELASTICSEARCH_CLIENT'
export const RESTAURANTS_INDEX = 'restaurants'
export const MENU_ITEMS_INDEX = 'menu_items'

@Injectable()
export class SearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchService.name)

  constructor(@Inject(ELASTICSEARCH_CLIENT) public readonly client: Client) {}

  public async onModuleInit(): Promise<void> {
    await this.ensureIndices()
  }

  public async onModuleDestroy(): Promise<void> {
    await this.client.close()
  }

  // ── Search ────────────────────────────────────────────────────────────────

  public async searchRestaurants(dto: SearchRestaurantsDto): Promise<unknown> {
    const must: object[] = []
    const filter: object[] = []

    if (dto.q?.trim()) {
      must.push({
        multi_match: {
          query: dto.q,
          fields: ['name^3', 'cuisineTypes^2', 'description', 'city'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      })
    } else {
      must.push({ match_all: {} })
    }

    // Only serve active restaurants
    filter.push({ term: { status: 'active' } })

    if (dto.lat !== undefined && dto.lng !== undefined) {
      filter.push({
        geo_distance: {
          distance: `${dto.radius ?? 10}km`,
          location: { lat: dto.lat, lon: dto.lng },
        },
      })
    }

    if (dto.cuisine?.length) {
      filter.push({ terms: { cuisineTypes: dto.cuisine } })
    }
    if (dto.priceRange !== undefined) {
      filter.push({ term: { priceRange: dto.priceRange } })
    }
    if (dto.minRating !== undefined) {
      filter.push({ range: { avgRating: { gte: dto.minRating } } })
    }
    if (dto.maxPrepTime !== undefined) {
      filter.push({ range: { avgPrepTimeMinutes: { lte: dto.maxPrepTime } } })
    }
    if (dto.isOpen !== undefined) {
      filter.push({ term: { isOpen: dto.isOpen } })
    }

    const sort: SortCombinations[] = this.buildRestaurantSort(dto)
    const from = ((dto.page ?? 1) - 1) * (dto.limit ?? 20)

    const response = await this.client.search({
      index: RESTAURANTS_INDEX,
      query: { bool: { must, filter } },
      sort: sort.length ? sort : undefined,
      from,
      size: dto.limit ?? 20,
      aggs: {
        cuisines: { terms: { field: 'cuisineTypes', size: 30 } },
        priceRanges: { terms: { field: 'priceRange', size: 4 } },
      },
    })

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : (response.hits.total?.value ?? 0)

    return {
      data: response.hits.hits.map((h) => ({ ...(h._source as object), _score: h._score })),
      total,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
      facets: {
        cuisines: (response.aggregations?.cuisines as { buckets?: unknown[] })?.buckets ?? [],
        priceRanges: (response.aggregations?.priceRanges as { buckets?: unknown[] })?.buckets ?? [],
      },
    }
  }

  public async searchMenuItems(dto: SearchMenuItemsDto): Promise<unknown> {
    const must: object[] = []
    const filter: object[] = [{ term: { isAvailable: true } }]

    if (dto.q?.trim()) {
      must.push({
        multi_match: {
          query: dto.q,
          fields: ['name^3', 'description^2', 'tags', 'restaurantName'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      })
    } else {
      must.push({ match_all: {} })
    }

    if (dto.restaurantId) filter.push({ term: { restaurantId: dto.restaurantId } })
    if (dto.minPrice !== undefined) filter.push({ range: { basePrice: { gte: dto.minPrice } } })
    if (dto.maxPrice !== undefined) filter.push({ range: { basePrice: { lte: dto.maxPrice } } })
    if (dto.isVegetarian) filter.push({ term: { isVegetarian: true } })
    if (dto.isVegan) filter.push({ term: { isVegan: true } })
    if (dto.isGlutenFree) filter.push({ term: { isGlutenFree: true } })
    if (dto.isHalal) filter.push({ term: { isHalal: true } })

    const from = ((dto.page ?? 1) - 1) * (dto.limit ?? 20)

    const response = await this.client.search({
      index: MENU_ITEMS_INDEX,
      query: { bool: { must, filter } },
      from,
      size: dto.limit ?? 20,
    })

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : (response.hits.total?.value ?? 0)

    return {
      data: response.hits.hits.map((h) => ({ ...(h._source as object), _score: h._score })),
      total,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    }
  }

  public async autocomplete(dto: AutocompleteDto): Promise<unknown> {
    const results: object[] = []
    const { q, type = 'all' } = dto

    if (type === 'restaurant' || type === 'all') {
      const res = await this.client.search({
        index: RESTAURANTS_INDEX,
        query: {
          bool: {
            must: [{ match_phrase_prefix: { name: { query: q, max_expansions: 10 } } }],
            filter: [{ term: { status: 'active' } }],
          },
        },
        _source: ['id', 'name', 'slug', 'logoUrl', 'cuisineTypes', 'avgRating', 'location'],
        size: 5,
      })
      results.push(...res.hits.hits.map((h) => ({ type: 'restaurant', ...(h._source as object) })))
    }

    if (type === 'item' || type === 'all') {
      const res = await this.client.search({
        index: MENU_ITEMS_INDEX,
        query: {
          bool: {
            must: [{ match_phrase_prefix: { name: { query: q, max_expansions: 10 } } }],
            filter: [{ term: { isAvailable: true } }],
          },
        },
        _source: [
          'id',
          'name',
          'restaurantId',
          'restaurantName',
          'restaurantSlug',
          'basePrice',
          'imageUrl',
        ],
        size: 5,
      })
      results.push(...res.hits.hits.map((h) => ({ type: 'item', ...(h._source as object) })))
    }

    return results
  }

  // ── Index Management ──────────────────────────────────────────────────────

  private async ensureIndices(): Promise<void> {
    await this.ensureRestaurantsIndex()
    await this.ensureMenuItemsIndex()
  }

  private async ensureRestaurantsIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: RESTAURANTS_INDEX })
    if (exists) return

    await this.client.indices.create({
      index: RESTAURANTS_INDEX,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          slug: { type: 'keyword' },
          description: { type: 'text' },
          cuisineTypes: { type: 'keyword' },
          priceRange: { type: 'integer' },
          avgRating: { type: 'float' },
          totalOrders: { type: 'integer' },
          avgPrepTimeMinutes: { type: 'integer' },
          minOrderAmount: { type: 'float' },
          deliveryFee: { type: 'float' },
          isOpen: { type: 'boolean' },
          status: { type: 'keyword' },
          location: { type: 'geo_point' },
          city: { type: 'keyword' },
          fullAddress: { type: 'text' },
          coverImageUrl: { type: 'keyword', index: false },
          logoUrl: { type: 'keyword', index: false },
          updatedAt: { type: 'date' },
        },
      },
    })
    this.logger.log(`Index created: ${RESTAURANTS_INDEX}`)
  }

  private async ensureMenuItemsIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: MENU_ITEMS_INDEX })
    if (exists) return

    await this.client.indices.create({
      index: MENU_ITEMS_INDEX,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          restaurantId: { type: 'keyword' },
          restaurantName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          restaurantSlug: { type: 'keyword' },
          name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          description: { type: 'text' },
          basePrice: { type: 'float' },
          currency: { type: 'keyword' },
          isAvailable: { type: 'boolean' },
          tags: { type: 'keyword' },
          isVegetarian: { type: 'boolean' },
          isVegan: { type: 'boolean' },
          isGlutenFree: { type: 'boolean' },
          isHalal: { type: 'boolean' },
          imageUrl: { type: 'keyword', index: false },
        },
      },
    })
    this.logger.log(`Index created: ${MENU_ITEMS_INDEX}`)
  }

  private buildRestaurantSort(dto: SearchRestaurantsDto): SortCombinations[] {
    if (dto.sort === 'distance' && dto.lat !== undefined && dto.lng !== undefined) {
      return [
        {
          _geo_distance: { location: { lat: dto.lat, lon: dto.lng }, order: 'asc', unit: 'km' },
        } as SortCombinations,
      ]
    }
    if (dto.sort === 'rating') return [{ avgRating: { order: 'desc' } } as SortCombinations]
    if (dto.sort === 'popularity') return [{ totalOrders: { order: 'desc' } } as SortCombinations]
    return [] // default: _score (relevance)
  }
}
