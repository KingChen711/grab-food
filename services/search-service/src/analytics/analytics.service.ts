import { Client } from '@elastic/elasticsearch'
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'

import { ELASTICSEARCH_CLIENT } from '../search/search.service'

export const SEARCH_ANALYTICS_INDEX = 'search_analytics'

export interface QueryEvent {
  query: string
  type: 'restaurant' | 'item' | 'autocomplete'
  resultCount: number
  city?: string
  userId?: string
}

export interface TrendingQuery {
  query: string
  count: number
}

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsService.name)

  constructor(@Inject(ELASTICSEARCH_CLIENT) private readonly client: Client) {}

  public async onModuleInit(): Promise<void> {
    await this.ensureIndex()
  }

  /**
   * Fire-and-forget — never throws. Search performance must not depend on analytics.
   */
  public logQuery(event: QueryEvent): void {
    if (!event.query?.trim()) return // skip empty queries (match_all browsing)

    void this.client
      .index({
        index: SEARCH_ANALYTICS_INDEX,
        document: {
          ...event,
          query: event.query.trim().toLowerCase(),
          timestamp: new Date().toISOString(),
        },
      })
      .catch((err) => {
        this.logger.warn(`Failed to log search query: ${(err as Error).message}`)
      })
  }

  /**
   * Top queries within a time window. Used by the home screen "trending now" section.
   * @param windowHours how far back to look (default 24h)
   * @param limit max results (default 10)
   */
  public async getTrendingQueries(
    windowHours = 24,
    limit = 10,
    city?: string,
  ): Promise<TrendingQuery[]> {
    const filter: object[] = [{ range: { timestamp: { gte: `now-${windowHours}h` } } }]
    if (city) filter.push({ term: { city } })

    const response = await this.client.search({
      index: SEARCH_ANALYTICS_INDEX,
      size: 0,
      query: { bool: { filter } },
      aggs: {
        top_queries: { terms: { field: 'query.keyword', size: limit } },
      },
    })

    const buckets =
      (
        response.aggregations?.top_queries as {
          buckets?: Array<{ key: string; doc_count: number }>
        }
      )?.buckets ?? []

    return buckets.map((b) => ({ query: b.key, count: b.doc_count }))
  }

  /**
   * All-time most popular queries. Useful for cache warm-up and SEO.
   */
  public async getPopularQueries(limit = 20): Promise<TrendingQuery[]> {
    return this.getTrendingQueries(24 * 365 * 10, limit) // ~10 years window = effectively all-time
  }

  private async ensureIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: SEARCH_ANALYTICS_INDEX })
    if (exists) return

    await this.client.indices.create({
      index: SEARCH_ANALYTICS_INDEX,
      mappings: {
        properties: {
          query: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          type: { type: 'keyword' },
          resultCount: { type: 'integer' },
          city: { type: 'keyword' },
          userId: { type: 'keyword' },
          timestamp: { type: 'date' },
        },
      },
    })
    this.logger.log(`Index created: ${SEARCH_ANALYTICS_INDEX}`)
  }
}
