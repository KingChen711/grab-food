import type { UserRole, UserStatus } from '@grab/types'
import { hash } from 'bcryptjs'
import type { DataSource } from 'typeorm'

import { User } from '../../users/entities/user.entity'
import { UserAddress } from '../../users/entities/user-address.entity'
import { UserProfile } from '../../users/entities/user-profile.entity'

const RESTAURANT_OWNER_ID = '11111111-1111-1111-1111-111111111111'
const CUSTOMER_ID = '22222222-2222-2222-2222-222222222222'

export async function seedUsers(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User)
  const profileRepo = dataSource.getRepository(UserProfile)
  const addressRepo = dataSource.getRepository(UserAddress)

  const existingOwner = await userRepo.findOne({
    where: { email: 'owner@example.com' },
    withDeleted: true,
  })

  if (!existingOwner) {
    const passwordHash = await hash('Password123!', 10)

    const owner = userRepo.create({
      id: RESTAURANT_OWNER_ID,
      email: 'owner@example.com',
      phone: '+84900000001',
      googleId: null,
      passwordHash,
      role: 'restaurant_owner' as UserRole,
      status: 'active' as UserStatus,
      isEmailVerified: true,
      isPhoneVerified: true,
    })

    await userRepo.save(owner)

    const ownerProfile = profileRepo.create({
      user: owner,
      fullName: 'Demo Restaurant Owner',
      avatarUrl: null,
      dateOfBirth: null,
      bio: 'Demo restaurant owner for development and testing.',
    })

    await profileRepo.save(ownerProfile)

    const ownerAddress = addressRepo.create({
      user: owner,
      label: 'Restaurant',
      fullAddress: '123 Demo Street, District 1, Ho Chi Minh City, Vietnam',
      street: '123 Demo Street',
      district: 'District 1',
      city: 'Ho Chi Minh City',
      country: 'Vietnam',
      lat: 10.775843,
      lng: 106.700806,
      isDefault: true,
    })

    await addressRepo.save(ownerAddress)
  }

  const existingCustomer = await userRepo.findOne({
    where: { email: 'customer@example.com' },
    withDeleted: true,
  })

  if (!existingCustomer) {
    const passwordHash = await hash('Password123!', 10)

    const customer = userRepo.create({
      id: CUSTOMER_ID,
      email: 'customer@example.com',
      phone: '+84900000002',
      googleId: null,
      passwordHash,
      role: 'customer' as UserRole,
      status: 'active' as UserStatus,
      isEmailVerified: true,
      isPhoneVerified: true,
    })

    await userRepo.save(customer)

    const customerProfile = profileRepo.create({
      user: customer,
      fullName: 'Demo Customer',
      avatarUrl: null,
      dateOfBirth: null,
      bio: 'Demo customer account for development and testing.',
    })

    await profileRepo.save(customerProfile)

    const customerAddress = addressRepo.create({
      user: customer,
      label: 'Home',
      fullAddress: '456 Sample Avenue, District 3, Ho Chi Minh City, Vietnam',
      street: '456 Sample Avenue',
      district: 'District 3',
      city: 'Ho Chi Minh City',
      country: 'Vietnam',
      lat: 10.78401,
      lng: 106.69502,
      isDefault: true,
    })

    await addressRepo.save(customerAddress)
  }
}
