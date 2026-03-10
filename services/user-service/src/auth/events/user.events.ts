export const USER_EVENTS = {
  REGISTERED: 'user.registered',
  VERIFIED: 'user.verified',
  PROFILE_UPDATED: 'user.profile.updated',
  ADDRESS_ADDED: 'user.address.added',
  DEACTIVATED: 'user.deactivated',
} as const

export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly role: string,
    public readonly registeredAt: Date,
  ) {}
}

export class UserVerifiedEvent {
  constructor(
    public readonly userId: string,
    public readonly method: 'email' | 'phone',
    public readonly verifiedAt: Date,
  ) {}
}
