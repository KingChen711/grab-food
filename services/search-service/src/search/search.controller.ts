import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { AutocompleteDto } from './dto/autocomplete.dto'
import { SearchMenuItemsDto } from './dto/search-menu-items.dto'
import { SearchRestaurantsDto } from './dto/search-restaurants.dto'
import { SearchService } from './search.service'

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('restaurants')
  @ApiOperation({ summary: 'Full-text + geo + faceted restaurant search' })
  public searchRestaurants(@Query() dto: SearchRestaurantsDto): Promise<unknown> {
    return this.searchService.searchRestaurants(dto)
  }

  @Get('items')
  @ApiOperation({ summary: 'Full-text menu item search' })
  public searchMenuItems(@Query() dto: SearchMenuItemsDto): Promise<unknown> {
    return this.searchService.searchMenuItems(dto)
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Typeahead suggestions for restaurants and menu items' })
  public autocomplete(@Query() dto: AutocompleteDto): Promise<unknown> {
    return this.searchService.autocomplete(dto)
  }
}
