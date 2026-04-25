import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator'

import { CreateMenuItemDto } from './create-menu-item.dto'

export class BulkImportItemsDto {
  @ApiProperty({
    type: [CreateMenuItemDto],
    description: 'Array of menu items to create. Max 500 per request.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateMenuItemDto)
  public items: CreateMenuItemDto[]
}

export class BulkImportCsvDto {
  @ApiProperty({
    description:
      'CSV content. First row must be header with field names. Required: name,basePrice. ' +
      'Optional: description,currency,prepTimeMinutes,calories,tags(semicolon-separated),' +
      'isVegetarian,isVegan,isGlutenFree,isHalal,isSpicy,spicyLevel,availableFrom,availableTo',
    example:
      'name,basePrice,description,isVegetarian\nPhở bò,75000,Beef noodle soup,false\nGỏi cuốn,45000,Spring rolls,true',
  })
  @IsString()
  public csv: string

  @ApiPropertyOptional({
    description: 'Default currency for items missing a currency cell',
    default: 'VND',
  })
  @IsOptional()
  @IsString()
  public defaultCurrency?: string
}

export interface BulkImportResult {
  imported: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}
