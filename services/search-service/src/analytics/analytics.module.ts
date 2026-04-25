import { Module } from '@nestjs/common'

import { SearchModule } from '../search/search.module'
import { AnalyticsController } from './analytics.controller'

@Module({
  imports: [SearchModule], // re-uses AnalyticsService + ES client from SearchModule
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
