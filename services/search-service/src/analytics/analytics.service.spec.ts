import { Test } from '@nestjs/testing'

import { ELASTICSEARCH_CLIENT } from '../search/search.service'
import { AnalyticsService } from './analytics.service'

const mockEs = () => ({
  index: jest.fn().mockResolvedValue({ result: 'created' }),
  search: jest.fn(),
  indices: {
    exists: jest.fn().mockResolvedValue(true),
    create: jest.fn(),
  },
})

describe('AnalyticsService', () => {
  let service: AnalyticsService
  let es: ReturnType<typeof mockEs>

  beforeEach(async () => {
    es = mockEs()
    const module = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: ELASTICSEARCH_CLIENT, useValue: es }],
    }).compile()

    service = module.get(AnalyticsService)
  })

  describe('logQuery', () => {
    it('writes a normalized query event to ES', async () => {
      service.logQuery({ query: '  Pho Saigon  ', type: 'restaurant', resultCount: 5 })

      // logQuery is fire-and-forget — wait a tick for the promise chain
      await new Promise((r) => setImmediate(r))

      expect(es.index).toHaveBeenCalledWith({
        index: 'search_analytics',
        document: expect.objectContaining({
          query: 'pho saigon',
          type: 'restaurant',
          resultCount: 5,
        }),
      })
    })

    it('skips empty queries', () => {
      service.logQuery({ query: '   ', type: 'restaurant', resultCount: 0 })
      service.logQuery({ query: '', type: 'restaurant', resultCount: 0 })

      expect(es.index).not.toHaveBeenCalled()
    })

    it('does not throw on ES write failure', async () => {
      es.index.mockRejectedValueOnce(new Error('ES down'))

      // Should not throw — logging failures must not break searches
      expect(() => service.logQuery({ query: 'pho', type: 'item', resultCount: 1 })).not.toThrow()
      await new Promise((r) => setImmediate(r))
    })
  })

  describe('getTrendingQueries', () => {
    it('returns top queries within window', async () => {
      es.search.mockResolvedValue({
        aggregations: {
          top_queries: {
            buckets: [
              { key: 'pho', doc_count: 42 },
              { key: 'banh mi', doc_count: 30 },
            ],
          },
        },
      })

      const result = await service.getTrendingQueries(24, 5)

      expect(result).toEqual([
        { query: 'pho', count: 42 },
        { query: 'banh mi', count: 30 },
      ])
      expect(es.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'search_analytics',
          size: 0,
        }),
      )
    })

    it('filters by city when provided', async () => {
      es.search.mockResolvedValue({ aggregations: { top_queries: { buckets: [] } } })

      await service.getTrendingQueries(24, 10, 'Ho Chi Minh City')

      const filter = es.search.mock.calls[0][0].query.bool.filter
      expect(filter).toContainEqual({ term: { city: 'Ho Chi Minh City' } })
    })

    it('returns empty array when ES has no buckets', async () => {
      es.search.mockResolvedValue({ aggregations: undefined })

      const result = await service.getTrendingQueries()

      expect(result).toEqual([])
    })
  })
})
