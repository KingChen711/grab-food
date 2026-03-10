import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { User } from './entities/user.entity'
import { UserAddress } from './entities/user-address.entity'
import { UserDevice } from './entities/user-device.entity'
import { UserProfile } from './entities/user-profile.entity'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile, UserAddress, UserDevice])],
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
