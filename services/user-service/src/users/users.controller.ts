import { CurrentUser, JwtAuthGuard } from '@grab/nestjs-common'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { CreateAddressDto } from './dto/create-address.dto'
import { UpdateAddressDto } from './dto/update-address.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { User } from './entities/user.entity'
import { UserAddress } from './entities/user-address.entity'
import { UsersService } from './users.service'

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  // ─── Profile Endpoints ────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  public getMe(@CurrentUser() user: User): User {
    return user
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
