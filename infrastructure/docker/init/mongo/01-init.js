// ─────────────────────────────────────────────────────────────────────────────
// MongoDB initialization script
// Creates databases and collections for order-service (Event Store)
// ─────────────────────────────────────────────────────────────────────────────

db = db.getSiblingDB('grab_orders');

db.createCollection('event_store', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['aggregateId', 'aggregateType', 'eventType', 'version', 'payload', 'occurredAt'],
      properties: {
        aggregateId: { bsonType: 'string' },
        aggregateType: { bsonType: 'string' },
        eventType: { bsonType: 'string' },
        version: { bsonType: 'int' },
        payload: { bsonType: 'object' },
        metadata: { bsonType: 'object' },
        occurredAt: { bsonType: 'date' },
      },
    },
  },
});

db.event_store.createIndex({ aggregateId: 1, version: 1 }, { unique: true });
db.event_store.createIndex({ aggregateType: 1, occurredAt: -1 });
db.event_store.createIndex({ eventType: 1 });

db.createCollection('snapshots');
db.snapshots.createIndex({ aggregateId: 1, version: -1 });

// ─────────────────────────────────────────────────────────────────────────────
db = db.getSiblingDB('grab_analytics');

db.createCollection('events');
db.events.createIndex({ timestamp: -1 });
db.events.createIndex({ userId: 1, timestamp: -1 });
db.events.createIndex({ eventType: 1, timestamp: -1 });
