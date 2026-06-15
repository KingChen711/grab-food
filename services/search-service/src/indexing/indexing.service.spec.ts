import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'

import { MENU_ITEMS_INDEX, RESTAURANTS_INDEX, SearchService } from '../search/search.service'
import { IndexingService, type MenuItemDocument, type RestaurantDocument } from './indexing.service'
import { KafkaConsumerService } from './kafka-consumer.service'

function makeRestaurantDoc(overrides: Partial<RestaurantDocument> = {}): RestaurantDocument {
  return {
    id: 'rest-1',
    name: 'Pizza Palace',
    slug: 'pizza-palace',
    description: null,
    cuisineTypes: ['italian'],
    priceRange: 2,
    avgRating: 4.5,
    totalOrders: 100,
    avgPrepTimeMinutes: 20,
    minOrderAmount: 0,
    deliveryFee: 15000,
    isOpen: true,
    status: 'active',
    lat: 10.77,
    lng: 106.7,
    city: 'HCMC',
    fullAddress: '1 Le Loi',
    coverImageUrl: null,
    logoUrl: null,
    updatedAt: '2026-06-15T00:00:00Z',
    ...overrides,
  }
}

// ─── IndexingService (Elasticsearch transformations) ────────────────────────────

describe('IndexingService', () => {
  let service: IndexingService
  let esClient: { index: jest.Mock; delete: jest.Mock; deleteByQuery: jest.Mock }

  beforeEach(async () => {
    esClient = {
      index: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteByQuery: jest.fn().mockResolvedValue(undefined),
    }

    const module = await Test.createTestingModule({
      providers: [IndexingService, { provide: SearchService, useValue: { client: esClient } }],
    }).compile()

    service = module.get(IndexingService)
  })

  afterEach(() => jest.clearAllMocks())

  it('upsertRestaurant maps lat/lng into an ES geo_point and indexes by id', async () => {
    await service.upsertRestaurant(makeRestaurantDoc())

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: RESTAURANTS_INDEX,
        id: 'rest-1',
        document: expect.objectContaining({ location: { lat: 10.77, lon: 106.7 } }),
      }),
    )
    // raw lat/lng should be folded into `location`, not left on the document
    const doc = esClient.index.mock.calls[0][0].document
    expect(doc.lat).toBeUndefined()
    expect(doc.lng).toBeUndefined()
  })

  it('deleteRestaurant swallows a missing-document error', async () => {
    esClient.delete.mockRejectedValueOnce(new Error('404'))
    await expect(service.deleteRestaurant('rest-1')).resolves.toBeUndefined()
  })

  it('deleteMenuItemsByRestaurant removes all items via a term query', async () => {
    await service.deleteMenuItemsByRestaurant('rest-1')

    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: MENU_ITEMS_INDEX,
      query: { term: { restaurantId: 'rest-1' } },
    })
  })
})

// ─── KafkaConsumerService (event → indexing routing) ────────────────────────────

describe('KafkaConsumerService routing', () => {
  let consumer: KafkaConsumerService
  let indexing: jest.Mocked<
    Pick<
      IndexingService,
      | 'upsertRestaurant'
      | 'deleteRestaurant'
      | 'deleteMenuItemsByRestaurant'
      | 'upsertMenuItem'
      | 'deleteMenuItem'
    >
  >

  const handle = (event: unknown) =>
    (
      consumer as unknown as { handleMessage: (m: { value: Buffer }) => Promise<void> }
    ).handleMessage({ value: Buffer.from(JSON.stringify(event)) })

  beforeEach(() => {
    indexing = {
      upsertRestaurant: jest.fn().mockResolvedValue(undefined),
      deleteRestaurant: jest.fn().mockResolvedValue(undefined),
      deleteMenuItemsByRestaurant: jest.fn().mockResolvedValue(undefined),
      upsertMenuItem: jest.fn().mockResolvedValue(undefined),
      deleteMenuItem: jest.fn().mockResolvedValue(undefined),
    }
    const config = { get: jest.fn((_k: string, d: string) => d) } as unknown as ConfigService
    consumer = new KafkaConsumerService(config, indexing as unknown as IndexingService)
  })

  it('routes restaurant.created / updated / approved to upsertRestaurant', async () => {
    const payload = makeRestaurantDoc()
    for (const type of ['restaurant.created', 'restaurant.updated', 'restaurant.approved']) {
      await handle({ type, payload })
    }
    expect(indexing.upsertRestaurant).toHaveBeenCalledTimes(3)
  })

  it('routes restaurant.deleted to both restaurant and menu-item cleanup', async () => {
    await handle({ type: 'restaurant.deleted', payload: { id: 'rest-1' } })

    expect(indexing.deleteRestaurant).toHaveBeenCalledWith('rest-1')
    expect(indexing.deleteMenuItemsByRestaurant).toHaveBeenCalledWith('rest-1')
  })

  it('routes menu_item.created / updated to upsertMenuItem', async () => {
    const payload = { id: 'item-1', restaurantId: 'rest-1' } as MenuItemDocument
    await handle({ type: 'menu_item.created', payload })
    await handle({ type: 'menu_item.updated', payload })
    expect(indexing.upsertMenuItem).toHaveBeenCalledTimes(2)
  })

  it('ignores malformed JSON without throwing', async () => {
    await expect(
      (
        consumer as unknown as { handleMessage: (m: { value: Buffer }) => Promise<void> }
      ).handleMessage({ value: Buffer.from('not-json{') }),
    ).resolves.toBeUndefined()
    expect(indexing.upsertRestaurant).not.toHaveBeenCalled()
  })

  it('does not rethrow when an indexing call fails (keeps the consumer alive)', async () => {
    indexing.upsertRestaurant.mockRejectedValueOnce(new Error('ES down'))
    await expect(
      handle({ type: 'restaurant.created', payload: makeRestaurantDoc() }),
    ).resolves.toBeUndefined()
  })
})
