# 9. Environment Variables

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

## Variables

| Variable                    | Default                                          | Description                             |
| --------------------------- | ------------------------------------------------ | --------------------------------------- |
| `NODE_ENV`                  | `development`                                    | `development` / `production` / `test`   |
| `PORT`                      | `3003`                                           | HTTP port the service listens on        |
| `ORDER_SERVICE_DB_HOST`     | `localhost`                                      | PostgreSQL host (read models)           |
| `ORDER_SERVICE_DB_PORT`     | `5432`                                           | PostgreSQL port                         |
| `ORDER_SERVICE_DB_USERNAME` | `postgres`                                       | PostgreSQL username                     |
| `ORDER_SERVICE_DB_PASSWORD` | `postgres`                                       | PostgreSQL password                     |
| `ORDER_SERVICE_DB_DATABASE` | `order_service`                                  | PostgreSQL database name                |
| `MONGODB_URI`               | `mongodb://localhost:27017/order_service_events` | MongoDB connection string (event store) |

## How variables are used

### PostgreSQL (read models)

Config file: `src/config/database.config.ts`

```typescript
export const databaseConfig = registerAs('database', () => ({
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'grab_user',
  password: process.env.POSTGRES_PASSWORD ?? 'grab_password',
  database: process.env.ORDER_SERVICE_DB ?? 'grab_orders',
}))
```

Used in `src/database/database.module.ts` to configure TypeORM.

In non-production environments, TypeORM runs with `synchronize: true` — it automatically creates/updates tables based on your entity classes. **Never use synchronize in production** — use migrations instead.

### MongoDB (event store)

Config file: `src/config/mongodb.config.ts`

```typescript
export const mongoConfig = registerAs('mongodb', () => ({
  uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/grab_orders',
}))
```

Used in `src/database/mongo.module.ts` to configure Mongoose.

## Running locally with Docker

If you're using the project's `docker-compose.yml`, PostgreSQL and MongoDB are already configured. You just need:

```bash
# .env.local
NODE_ENV=development
PORT=3003
MONGODB_URI=mongodb://localhost:27017/order_service_events
ORDER_SERVICE_DB_HOST=localhost
ORDER_SERVICE_DB_PORT=5432
ORDER_SERVICE_DB_USERNAME=grab_user
ORDER_SERVICE_DB_PASSWORD=grab_password
ORDER_SERVICE_DB_DATABASE=grab_orders
```
