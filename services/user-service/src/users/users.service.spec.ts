import { EventEmitter2 } from '@nestjs/event-emitter'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { USER_EVENTS } from '../auth/events/user.events'
import type { User } from './entities/user.entity'
import type { UserAddress } from './entities/user-address.entity'
import type { UserProfile } from './entities/user-profile.entity'
import { GeocodingService } from './geocoding.service'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'

describe('UsersService', () => {
  let service: UsersService
  let usersRepo: jest.Mocked<UsersRepository>
  let eventEmitter: jest.Mocked<EventEmitter2>
  let geocodingService: jest.Mocked<GeocodingService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findAddressesByUser: jest.fn(),
            addAddress: jest.fn(),
            unsetDefaultAddresses: jest.fn(),
            countAddresses: jest.fn().mockResolvedValue(0),
            findAddressById: jest.fn(),
            updateAddress: jest.fn(),
            deleteAddress: jest.fn(),
            setDefaultAddress: jest.fn(),
            updateProfile: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: GeocodingService,
          useValue: {
            getCoordinatesFromAddress: jest.fn(),
            getAddressFromCoordinates: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    usersRepo = module.get(UsersRepository)
    eventEmitter = module.get(EventEmitter2)
    geocodingService = module.get(GeocodingService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Address Management', () => {
    it('should add an address and geocode if lat/lng are missing', async () => {
      const dto = { fullAddress: '123 Fake St' }
      geocodingService.getCoordinatesFromAddress.mockResolvedValueOnce({ lat: 10, lng: 20 })
      usersRepo.findAddressesByUser.mockResolvedValueOnce([])
      usersRepo.addAddress.mockResolvedValueOnce({ id: 'addr-1' } as UserAddress)

      const result = await service.addAddress('user-1', dto)

      expect(geocodingService.getCoordinatesFromAddress).toHaveBeenCalledWith('123 Fake St')
      expect(usersRepo.addAddress).toHaveBeenCalledWith('user-1', {
        ...dto,
        lat: 10,
        lng: 20,
        isDefault: true,
      })
      expect(eventEmitter.emit).toHaveBeenCalledWith(USER_EVENTS.ADDRESS_ADDED, {
        userId: 'user-1',
        addressId: 'addr-1',
      })
      expect(result.id).toBe('addr-1')
    })

    it('should set default address and unset others', async () => {
      usersRepo.findAddressById.mockResolvedValueOnce({ id: 'addr-1' } as UserAddress)

      await service.setDefaultAddress('user-1', 'addr-1')

      expect(usersRepo.unsetDefaultAddresses).toHaveBeenCalledWith('user-1')
      expect(usersRepo.setDefaultAddress).toHaveBeenCalledWith('addr-1')
    })
  })

  describe('Profile Management', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 'user-1',
        profile: { fullName: 'Test User' } as UserProfile,
      } as User
      usersRepo.findById.mockResolvedValueOnce(mockUser)

      const result = await service.getProfile('user-1')
      expect(result.fullName).toBe('Test User')
    })

    it('should update profile and emit event', async () => {
      const dto = { fullName: 'New Name' }

      await service.updateProfile('user-1', dto)

      expect(usersRepo.updateProfile).toHaveBeenCalledWith('user-1', dto)
      expect(eventEmitter.emit).toHaveBeenCalledWith(USER_EVENTS.PROFILE_UPDATED, {
        userId: 'user-1',
        dto,
      })
    })
  })
})
