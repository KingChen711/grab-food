'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.EventTopics = void 0
exports.EventTopics = {
  // User
  USER_REGISTERED: 'user.registered',
  USER_VERIFIED: 'user.verified',
  // Order
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status.changed',
  ORDER_CANCELLED: 'order.cancelled',
  // Payment
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  REFUND_PROCESSED: 'refund.processed',
  // Delivery
  DRIVER_ASSIGNED: 'delivery.driver.assigned',
  DRIVER_LOCATION_UPDATED: 'delivery.location.updated',
  DELIVERY_COMPLETED: 'delivery.completed',
  // Restaurant
  RESTAURANT_APPROVED: 'restaurant.approved',
  MENU_ITEM_UPDATED: 'restaurant.menu.item.updated',
  INVENTORY_OUT_OF_STOCK: 'restaurant.inventory.out_of_stock',
  // Notification
  NOTIFICATION_REQUESTED: 'notification.requested',
}
//# sourceMappingURL=events.types.js.map
