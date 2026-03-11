import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { CreateAddressDto } from './dto/create-address.dto'
import type { UpdateAddressDto } from './dto/update-address.dto'
import type { UpdateProfileDto } from './dto/update-profile.dto'
import type { User } from './entities/user.entity'
import type { UserAddress } from './entities/user-address.entity'
import type { UserProfile } from './entities/user-profile.entity'
import type { UsersService } from './users.service'

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Profile Endpoints ────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  public getProfile(@CurrentUser() user: User): Promise<UserProfile> {
    return this.usersService.getProfile(user.id)
  }

  @Patch('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 204, description: 'Profile updated successfully' })
  public updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto): Promise<void> {
    return this.usersService.updateProfile(user.id, dto)
  }

  // ─── Address Endpoints ────────────────────────────────────

  @Get('me/addresses')
  @ApiOperation({ summary: 'Get current user addresses' })
  @ApiResponse({ status: 200, description: 'Addresses retrieved successfully' })
  public getAddresses(@CurrentUser() user: User): Promise<UserAddress[]> {
    return this.usersService.getAddresses(user.id)
  }

  @Post('me/addresses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new address (geocodes automatically if missing lat/lng)' })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  public addAddress(
    @CurrentUser() user: User,
    @Body() dto: CreateAddressDto,
  ): Promise<UserAddress> {
    return this.usersService.addAddress(user.id, dto)
  }

  @Patch('me/addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update an existing address' })
  @ApiResponse({ status: 204, description: 'Address updated successfully' })
  public updateAddress(
    @CurrentUser() user: User,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<void> {
    return this.usersService.updateAddress(user.id, addressId, dto)
  }

  @Delete('me/addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  @ApiResponse({ status: 204, description: 'Address deleted successfully' })
  public deleteAddress(@CurrentUser() user: User, @Param('id') addressId: string): Promise<void> {
    return this.usersService.deleteAddress(user.id, addressId)
  }

  @Patch('me/addresses/:id/default')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set an address as default' })
  @ApiResponse({ status: 204, description: 'Default address set successfully' })
  public setDefaultAddress(
    @CurrentUser() user: User,
    @Param('id') addressId: string,
  ): Promise<void> {
    return this.usersService.setDefaultAddress(user.id, addressId)
  }
}
