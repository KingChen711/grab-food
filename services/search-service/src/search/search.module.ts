import { Client } from '@elastic/elasticsearch'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { AnalyticsService } from '../analytics/analytics.service'
import { SearchController } from './search.controller'
import { ELASTICSEARCH_CLIENT, SearchService } from './search.service'

@Module({
  imports: [ConfigModule],
  controllers: [SearchController],
  providers: [
    {
      provide: ELASTICSEARCH_CLIENT,
      useFactory: (config: ConfigService) =>
        new Client({ node: config.getOrThrow<string>('elasticsearch.node') }),
      inject: [ConfigService],
    },
    SearchService,
    AnalyticsService,
  ],
  exports: [SearchService, AnalyticsService, ELASTICSEARCH_CLIENT],
})
export class SearchModule {}
