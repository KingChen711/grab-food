export abstract class BaseOrderEvent {
  public readonly occurredOn: Date

  constructor(public readonly orderId: string) {
    this.occurredOn = new Date()
  }
}
