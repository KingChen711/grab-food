import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { AnalyticsService } from '../analytics/analytics.service'
import { AutocompleteDto } from './dto/autocomplete.dto'
import { SearchMenuItemsDto } from './dto/search-menu-items.dto'
import { SearchRestaurantsDto } from './dto/search-restaurants.dto'
import { SearchService } from './search.service'

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get('restaurants')
  @ApiOperation({ summary: 'Full-text + geo + faceted restaurant search' })
  public async searchRestaurants(@Query() dto: SearchRestaurantsDto): Promise<unknown> {
    const result = (await this.searchService.searchRestaurants(dto)) as { total: number }
    this.analytics.logQuery({
      query: dto.q ?? '',
      type: 'restaurant',
      resultCount: result.total,
    })
    return result
  }

  @Get('items')
  @ApiOperation({ summary: 'Full-text menu item search' })
  public async searchMenuItems(@Query() dto: SearchMenuItemsDto): Promise<unknown> {
    const result = (await this.searchService.searchMenuItems(dto)) as { total: number }
    this.analytics.logQuery({
      query: dto.q ?? '',
      type: 'item',
      resultCount: result.total,
    })
    return result
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Typeahead suggestions for restaurants and menu items' })
  public async autocomplete(@Query() dto: AutocompleteDto): Promise<unknown> {
    const results = (await this.searchService.autocomplete(dto)) as unknown[]
    this.analytics.logQuery({
      query: dto.q,
      type: 'autocomplete',
      resultCount: results.length,
    })
    return results
  }
}
