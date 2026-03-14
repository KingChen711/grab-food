import { Client } from '@elastic/elasticsearch'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'

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
  ],
  exports: [SearchService, ELASTICSEARCH_CLIENT],
})
export class SearchModule {}
