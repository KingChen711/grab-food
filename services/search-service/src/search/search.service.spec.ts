import { Test } from '@nestjs/testing'

import { ELASTICSEARCH_CLIENT, SearchService } from './search.service'

function makeHit(source: object, score = 1.0) {
  return { _source: source, _score: score }
}

function makeEsResponse(hits: object[], total: number, aggs: object = {}) {
  return {
    hits: {
      hits,
      total: { value: total },
    },
    aggregations: aggs,
  }
}

const mockEs = () => ({
  search: jest.fn(),
  indices: {
    exists: jest.fn().mockResolvedValue(true), // indices already exist
    create: jest.fn(),
  },
  close: jest.fn(),
})

describe('SearchService', () => {
  let service: SearchService
  let es: ReturnType<typeof mockEs>

  beforeEach(async () => {
    es = mockEs()

    const module = await Test.createTestingModule({
      providers: [SearchService, { provide: ELASTICSEARCH_CLIENT, useValue: es }],
    }).compile()

    service = module.get(SearchService)
  })

  // ── searchRestaurants ──────────────────────────────────────────────────────

  describe('searchRestaurants', () => {
    it('returns paginated results with facets', async () => {
      const restaurantDoc = {
        id: 'r-1',
        name: 'Pho Saigon',
        slug: 'pho-saigon',
        cuisineTypes: ['Vietnamese'],
        avgRating: 4.5,
        isOpen: true,
        status: 'active',
      }

      es.search.mockResolvedValue(
        makeEsResponse([makeHit(restaurantDoc)], 1, {
          cuisines: { buckets: [{ key: 'Vietnamese', doc_count: 1 }] },
          priceRanges: { buckets: [{ key: 1, doc_count: 1 }] },
        }),
      )

      const result = await service.searchRestaurants({ q: 'pho', page: 1, limit: 10 })

      expect(result).toMatchObject({
        data: [expect.objectContaining({ name: 'Pho Saigon' })],
        total: 1,
        page: 1,
        limit: 10,
        facets: {
          cuisines: [{ key: 'Vietnamese', doc_count: 1 }],
          priceRanges: [{ key: 1, doc_count: 1 }],
        },
      })
    })

    it('defaults to page 1 and limit 20 when not specified', async () => {
      es.search.mockResolvedValue(makeEsResponse([], 0))

      await service.searchRestaurants({})

      const call = es.search.mock.calls[0][0]
      expect(call.from).toBe(0)
      expect(call.size).toBe(20)
    })

    it('applies geo_distance filter when lat/lng provided', async () => {
      es.search.mockResolvedValue(makeEsResponse([], 0))

      await service.searchRestaurants({ lat: 10.7769, lng: 106.7009, radius: 5 })

      const query = es.search.mock.calls[0][0].query
      const filters = query.bool.filter
      const geoFilter = filters.find((f: any) => f.geo_distance)
      expect(geoFilter).toBeDefined()
      expect(geoFilter.geo_distance.distance).toBe('5km')
      expect(geoFilter.geo_distance.location).toEqual({ lat: 10.7769, lon: 106.7009 })
    })

    it('applies default radius of 10km when lat/lng provided without radius', async () => {
      es.search.mockResolvedValue(makeEsResponse([], 0))

      await service.searchRestaurants({ lat: 10.7769, lng: 106.7009 })

      const filters = es.search.mock.calls[0][0].query.bool.filter
      const geoFilter = filters.find((f: any) => f.geo_distance)
      expect(geoFilter.geo_distance.distance).toBe('10km')
    })

    it('applies cuisine filter when provided', async () => {
      es.search.mockResolvedValue(makeEsResponse([], 0))

      await service.searchRestaurants({ cuisine: ['Vietnamese', 'Thai'] })

      const filters = es.search.mock.calls[0][0].query.bool.filter
      const termsFilter = filters.find((f: any) => f.terms?.['cuisineTypes.keyword'])
      expect(termsFilter.terms['cuisineTypes.keyword']).toEqual(['Vietnamese', 'Thai'])
    })

    it('applies priceRange, minRating, isOpen filters', async () => {
      es.search.mockResolvedValue(makeEsResponse([], 0))

      await service.searchRestaurants({ priceRange: 2, minRating: 4, isOpen: true })

      const filters = es.search.mock.calls[0][0].query.bool.filter
      expect(filters).toContainEqual({ term: { priceRange: 2 } })
      expect(filters).toContainEqual({ range: { avgRating: { gte: 4 } } })
      expect(filters).toContainEqual({ term: { isOpen: true } })
    })

    it('sorts by geo distance when sort=distance and coords provided', async () => {
      es.search.mockResolvedValue(makeEsResponse([], 0))

      await service.searchRestaurants({ sort: 'distance', lat: 10.7, lng: 106.7 })

      const sort = es.search.mock.calls[0][0].sort
      expect(sort[0]._geo_distance).toBeDefined()
      expect(sort[0]._geo_distance.order).toBe('asc')
    })

    it('sorts by avgRating desc when sort=rating', async () => {
      es.search.mockResolvedValue(makeEsResponse([], 0))

      await service.searchRestaurants({ sort: 'rating' })

      const sort = es.search.mock.calls[0][0].sort
      expect(sort).toContainEqual({ avgRating: { order: 'desc' } })
    })

    it('calculates correct from offset for page 3 limit 10', async () => {
      es.search.mockResolvedValue(makeEsResponse([], 0))

      await service.searchRestaurants({ page: 3, limit: 10 })

      expect(es.search.mock.calls[0][0].from).toBe(20)
    })
  })

  // ── searchMenuItems ────────────────────────────────────────────────────────

  describe('searchMenuItems', () => {
    it('returns paginated menu item results', async () => {
      const itemDoc = {
        id: 'item-1',
        name: 'Phở bò',
        restaurantId: 'r-1',
        basePrice: 85000,
        isAvailable: true,
      }
      es.search.mockResolvedValue(makeEsResponse([makeHit(itemDoc)], 1))

      const result = await service.searchMenuItems({ q: 'pho', page: 1, limit: 10 })

      expect(result).toMatchObject({
        data: [expect.objectContaining({ name: 'Phở bò' })],
        total: 1,
        page: 1,
      })
    })

    it('filters by restaurantId', async () => {
      es.search.mockResolvedValue(makeEsResponse([], 0))

      await service.searchMenuItems({ restaurantId: 'r-1' })

      const filters = es.search.mock.calls[0][0].query.bool.filter
      expect(filters).toContainEqual({ term: { restaurantId: 'r-1' } })
    })

    it('always includes isAvailable:true filter', async () => {
      es.search.mockResolvedValue(makeEsResponse([], 0))

      await service.searchMenuItems({})

      const filters = es.search.mock.calls[0][0].query.bool.filter
      expect(filters).toContainEqual({ term: { isAvailable: true } })
    })

    it('applies dietary flags (isVegetarian, isVegan, isGlutenFree, isHalal)', async () => {
      es.search.mockResolvedValue(makeEsResponse([], 0))

      await service.searchMenuItems({ isVegetarian: true, isHalal: true })

      const filters = es.search.mock.calls[0][0].query.bool.filter
      expect(filters).toContainEqual({ term: { isVegetarian: true } })
      expect(filters).toContainEqual({ term: { isHalal: true } })
    })
  })

  // ── autocomplete ──────────────────────────────────────────────────────────

  describe('autocomplete', () => {
    it('returns merged restaurant and menu item suggestions', async () => {
      const restaurantHit = makeHit({ id: 'r-1', name: 'Pho Saigon', type: 'restaurant' })
      const itemHit = makeHit({ id: 'item-1', name: 'Phở bò', type: 'item' })

      es.search
        .mockResolvedValueOnce(makeEsResponse([restaurantHit], 1))
        .mockResolvedValueOnce(makeEsResponse([itemHit], 1))

      const results = await service.autocomplete({ q: 'pho', type: 'all' })

      expect(es.search).toHaveBeenCalledTimes(2)
      expect(results).toHaveLength(2)
    })

    it('only queries restaurants when type=restaurant', async () => {
      es.search.mockResolvedValue(makeEsResponse([], 0))

      await service.autocomplete({ q: 'pho', type: 'restaurant' })

      expect(es.search).toHaveBeenCalledTimes(1)
      const call = es.search.mock.calls[0][0]
      expect(call.index).toBe('restaurants')
    })

    it('only queries menu items when type=item', async () => {
      es.search.mockResolvedValue(makeEsResponse([], 0))

      await service.autocomplete({ q: 'pho', type: 'item' })

      expect(es.search).toHaveBeenCalledTimes(1)
      const call = es.search.mock.calls[0][0]
      expect(call.index).toBe('menu_items')
    })
  })
})
