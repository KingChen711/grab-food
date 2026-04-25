import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common'
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'

import { AnalyticsService, type TrendingQuery } from './analytics.service'

@ApiTags('search-analytics')
@Controller('search')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('trending')
  @ApiOperation({ summary: 'Top search queries in the last N hours (default 24h)' })
  @ApiQuery({ name: 'hours', required: false, type: Number, example: 24 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'city', required: false, type: String })
  public trending(
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('city') city?: string,
  ): Promise<TrendingQuery[]> {
    return this.analytics.getTrendingQueries(hours, limit, city)
  }

  @Get('popular')
  @ApiOperation({ summary: 'All-time most popular search queries' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  public popular(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<TrendingQuery[]> {
    return this.analytics.getPopularQueries(limit)
  }
}
