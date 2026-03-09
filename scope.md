# GrabFood Clone — Real-time Food Delivery Platform

> **Mục tiêu**: Xây dựng một hệ thống food delivery hoàn chỉnh ở mức production-grade, thể hiện năng lực thiết kế hệ thống phân tán, real-time, và full-stack engineering.

---

## Mục lục

- [1. Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
- [2. Tech Stack chi tiết](#2-tech-stack-chi-tiết)
- [3. Microservices Breakdown](#3-microservices-breakdown)
- [4. Database Design](#4-database-design)
- [5. Advanced Patterns & Concepts](#5-advanced-patterns--concepts)
- [6. Frontend Architecture](#6-frontend-architecture)
- [7. Infrastructure & DevOps](#7-infrastructure--devops)
- [8. Monitoring & Observability](#8-monitoring--observability)
- [9. Testing Strategy](#9-testing-strategy)
- [10. Security](#10-security)
- [11. Phân pha triển khai (Phases)](#11-phân-pha-triển-khai-phases)
- [12. Folder Structure](#12-folder-structure)

---

## 1. Tổng quan kiến trúc

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐                │
│  │  Customer    │  │  Restaurant │  │   Driver     │                │
│  │  Web App     │  │  Dashboard  │  │  Mobile PWA  │                │
│  │  (Next.js)   │  │  (Next.js)  │  │  (Next.js)   │                │
│  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘                │
│         └─────────────────┼─────────────────┘                        │
│                           ▼                                          │
│              ┌────────────────────────┐                              │
│              │    CDN (CloudFront)    │                              │
│              └────────────┬───────────┘                              │
└───────────────────────────┼──────────────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      GATEWAY LAYER                                   │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   API Gateway (NestJS)                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────────┐ │  │
│  │  │  Rate    │ │  Auth    │ │  Request  │ │  Load Balancer  │ │  │
│  │  │  Limiter │ │  Guard   │ │  Logger   │ │  (Round Robin)  │ │  │
│  │  └──────────┘ └──────────┘ └───────────┘ └─────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │               GraphQL Federation Gateway                       │  │
│  │         (Apollo Federation / Mercurius)                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     SERVICE MESH                                     │
│                                                                      │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │  User    │ │  Restaurant  │ │  Order   │ │    Delivery       │  │
│  │  Service │ │  Service     │ │  Service │ │    Service        │  │
│  └──────────┘ └──────────────┘ └──────────┘ └───────────────────┘  │
│                                                                      │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ Payment  │ │ Notification │ │  Search  │ │   Analytics       │  │
│  │ Service  │ │ Service      │ │  Service │ │   Service         │  │
│  └──────────┘ └──────────────┘ └──────────┘ └───────────────────┘  │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐    │
│  │  Media       │ │  Promotion   │ │  Recommendation          │    │
│  │  Service     │ │  Service     │ │  Service (ML Pipeline)   │    │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘    │
└──────────────────────────────┬───────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     MESSAGE BROKER LAYER                             │
│  ┌──────────────────────┐  ┌────────────────────────┐               │
│  │  RabbitMQ            │  │  Redis Streams /        │               │
│  │  (Command Bus)       │  │  Pub/Sub (Real-time)    │               │
│  └──────────────────────┘  └────────────────────────┘               │
│  ┌──────────────────────┐  ┌────────────────────────┐               │
│  │  Apache Kafka        │  │  BullMQ                 │               │
│  │  (Event Sourcing)    │  │  (Job Queue / Cron)     │               │
│  └──────────────────────┘  └────────────────────────┘               │
└──────────────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                      │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐              │
│  │PostgreSQL│ │ MongoDB  │ │  Redis    │ │ Elastic  │              │
│  │(Users,   │ │(Orders,  │ │(Cache,    │ │ Search   │              │
│  │ Payment) │ │ Events)  │ │ Sessions) │ │(Search)  │              │
│  └──────────┘ └──────────┘ └───────────┘ └──────────┘              │
│  ┌──────────────────┐  ┌──────────────────────────┐                 │
│  │  MinIO / S3      │  │  ClickHouse              │                 │
│  │  (Object Storage)│  │  (Analytics OLAP)        │                 │
│  └──────────────────┘  └──────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────────┘
```

### Actors trong hệ thống

| Actor                | Mô tả                                                        |
| -------------------- | ------------------------------------------------------------ |
| **Customer**         | Đặt đồ ăn, theo dõi đơn hàng real-time, thanh toán, đánh giá |
| **Restaurant Owner** | Quản lý menu, nhận đơn, quản lý inventory, xem analytics     |
| **Driver**           | Nhận đơn giao, navigation, cập nhật trạng thái, thu nhập     |
| **Admin**            | Quản lý toàn bộ hệ thống, dashboard analytics, moderation    |

---

## 2. Tech Stack chi tiết

### Frontend

| Công nghệ                   | Vai trò                                                    |
| --------------------------- | ---------------------------------------------------------- |
| **Next.js 15 (App Router)** | Framework chính, SSR/SSG/ISR, React Server Components      |
| **React 19**                | UI library với Concurrent Features, Suspense, use() hook   |
| **Shadcn/ui**               | Component library (Radix UI primitives + Tailwind)         |
| **Tailwind CSS 4**          | Utility-first CSS                                          |
| **Zustand**                 | Client state management (lightweight, no boilerplate)      |
| **TanStack Query v5**       | Server state, caching, optimistic updates, infinite scroll |
| **Socket.IO Client**        | Real-time WebSocket communication                          |
| **Mapbox GL JS / Leaflet**  | Bản đồ, tracking vị trí driver, routing                    |
| **Framer Motion**           | Animation & page transitions                               |
| **React Hook Form + Zod**   | Form handling + schema validation                          |
| **next-intl**               | Internationalization (i18n) — Vietnamese, English          |
| **next-themes**             | Dark/Light mode                                            |
| **Recharts / Tremor**       | Charts cho analytics dashboard                             |
| **Storybook**               | Component documentation & visual testing                   |

### Backend (NestJS Microservices)

| Công nghệ                               | Vai trò                                                   |
| --------------------------------------- | --------------------------------------------------------- |
| **NestJS 11**                           | Backend framework, microservices architecture             |
| **TypeORM**                             | ORM cho PostgreSQL (User, Payment, Restaurant)            |
| **Mongoose / Prisma**                   | ODM cho MongoDB (Orders, Events, Reviews)                 |
| **Passport.js**                         | Authentication strategies (JWT, OAuth2, Google, Facebook) |
| **class-validator + class-transformer** | DTO validation & serialization                            |
| **@nestjs/microservices**               | Microservice transport (TCP, RabbitMQ, Kafka, Redis)      |
| **@nestjs/websockets + Socket.IO**      | Real-time gateway                                         |
| **@nestjs/bull**                        | Job queue (BullMQ + Redis)                                |
| **@nestjs/graphql + Apollo Federation** | GraphQL Federation gateway                                |
| **@nestjs/throttler**                   | Rate limiting                                             |
| **@nestjs/cache-manager**               | Multi-layer caching (Redis)                               |
| **@nestjs/terminus**                    | Health checks                                             |
| **@nestjs/swagger**                     | Auto-generated API documentation                          |
| **@nestjs/event-emitter**               | Internal event bus                                        |
| **nestjs-otel**                         | OpenTelemetry distributed tracing                         |

### Message Brokers & Streaming

| Công nghệ                   | Vai trò                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| **RabbitMQ**                | Command/message bus (order commands, payment processing)           |
| **Apache Kafka**            | Event streaming, Event Sourcing log, CQRS projections              |
| **Redis Pub/Sub + Streams** | Real-time location updates, live notifications                     |
| **BullMQ**                  | Background jobs (email, SMS, push notification, report generation) |

### Databases

| Database            | Vai trò                                            | Service                                           |
| ------------------- | -------------------------------------------------- | ------------------------------------------------- |
| **PostgreSQL 16**   | Relational data (ACID)                             | user-service, payment-service, restaurant-service |
| **MongoDB 7**       | Document store, Event Store                        | order-service, review-service                     |
| **Redis 7**         | Cache, Session, Pub/Sub, Rate Limiting, Geospatial | Tất cả services                                   |
| **Elasticsearch 8** | Full-text search, geo search                       | search-service                                    |
| **ClickHouse**      | Analytics OLAP, aggregation                        | analytics-service                                 |
| **MinIO**           | Object storage (ảnh, menu, avatar)                 | media-service                                     |

### Infrastructure & DevOps

| Công nghệ                   | Vai trò                                            |
| --------------------------- | -------------------------------------------------- |
| **Docker + Docker Compose** | Containerization, local dev                        |
| **Kubernetes (K8s)**        | Container orchestration (optional, for production) |
| **Helm Charts**             | K8s package management                             |
| **GitHub Actions**          | CI/CD pipeline                                     |
| **Terraform**               | Infrastructure as Code                             |
| **Nginx**                   | Reverse proxy, SSL termination                     |
| **Traefik**                 | Service discovery, automatic HTTPS                 |
| **Vault (HashiCorp)**       | Secrets management                                 |

### Monitoring & Observability

| Công nghệ                                         | Vai trò                                    |
| ------------------------------------------------- | ------------------------------------------ |
| **Prometheus**                                    | Metrics collection                         |
| **Grafana**                                       | Dashboards, alerting                       |
| **Jaeger / Zipkin**                               | Distributed tracing                        |
| **OpenTelemetry**                                 | Telemetry standard (traces, metrics, logs) |
| **ELK Stack** (Elasticsearch + Logstash + Kibana) | Centralized logging                        |
| **Sentry**                                        | Error tracking (frontend + backend)        |

---

## 3. Microservices Breakdown

### 3.1 API Gateway Service

```
Port: 3000
Transport: HTTP/HTTPS, GraphQL
```

**Responsibilities:**

- Request routing đến đúng microservice
- Authentication & Authorization (JWT verification)
- Rate limiting (per user, per IP, per endpoint)
- Request/Response transformation
- API versioning (`/api/v1/`, `/api/v2/`)
- Request logging & correlation ID injection
- Circuit Breaker cho downstream services
- Response caching (GET requests)
- GraphQL Federation gateway (merge subgraphs từ các services)
- WebSocket proxy cho real-time connections
- Request body size limiting
- CORS configuration
- IP whitelisting/blacklisting

**Key Patterns:**

- Aggregator Pattern — gộp response từ nhiều services
- Backend for Frontend (BFF) — response khác nhau cho Web/Mobile
- Canary Routing — route % traffic đến version mới

---

### 3.2 User Service

```
Port: 3001
Database: PostgreSQL
Transport: TCP (NestJS microservice), RabbitMQ
```

**Responsibilities:**

- Registration (email, phone, social login)
- Authentication (JWT access + refresh token rotation)
- OAuth2 integration (Google, Facebook, Apple)
- 2FA / OTP via SMS/Email
- Profile management (customer, driver, restaurant owner, admin)
- Role-Based Access Control (RBAC) + Attribute-Based Access Control (ABAC)
- Address management (multiple saved addresses with geolocation)
- Favorites (restaurants, dishes)
- Device management (push notification tokens)
- Account deactivation / deletion (GDPR)
- Login history & session management

**Database Schema (PostgreSQL):**

- `users` — id, email, phone, password_hash, role, status, created_at
- `user_profiles` — user_id, full_name, avatar_url, date_of_birth
- `user_addresses` — user_id, label, address, lat, lng, is_default
- `user_devices` — user_id, device_token, platform, last_active
- `refresh_tokens` — user_id, token_hash, expires_at, revoked
- `oauth_accounts` — user_id, provider, provider_id
- `user_favorites` — user_id, restaurant_id, dish_id

**Events Produced:**

- `user.registered`
- `user.verified`
- `user.profile.updated`
- `user.address.added`
- `user.deactivated`

---

### 3.3 Restaurant Service

```
Port: 3002
Database: PostgreSQL + Redis (cache)
Transport: TCP, RabbitMQ
```

**Responsibilities:**

- Restaurant CRUD (thông tin, giờ mở cửa, vị trí)
- Menu management (categories, items, variants, modifiers, addons)
- Inventory management (stock tracking, auto-disable khi hết hàng)
- Pricing engine (base price, variants, addons, dynamic pricing)
- Operating hours & holiday schedules
- Restaurant approval workflow (pending → approved → active)
- Preparation time estimation (dựa trên queue hiện tại)
- Restaurant rating aggregation
- Geo-based restaurant discovery
- Bulk menu upload (CSV/Excel import)
- Menu item availability scheduling (breakfast, lunch, dinner)

**Database Schema (PostgreSQL):**

- `restaurants` — id, owner_id, name, description, address, lat, lng, status, avg_rating, total_orders, prep_time_avg
- `restaurant_hours` — restaurant_id, day_of_week, open_time, close_time
- `menu_categories` — id, restaurant_id, name, sort_order, is_active
- `menu_items` — id, category_id, name, description, base_price, image_url, is_available, prep_time_minutes
- `menu_item_variants` — id, item_id, name, price_adjustment
- `menu_item_addons` — id, item_id, name, price, max_quantity
- `inventory` — item_id, quantity, low_stock_threshold
- `restaurant_reviews` — id, restaurant_id, user_id, order_id, rating, comment, created_at

**Events Produced:**

- `restaurant.created`
- `restaurant.approved`
- `menu.item.updated`
- `inventory.low_stock`
- `inventory.out_of_stock`
- `restaurant.rating.updated`

---

### 3.4 Order Service (Core — CQRS + Event Sourcing)

```
Port: 3003
Database: MongoDB (Event Store) + PostgreSQL (Read Model)
Transport: RabbitMQ, Kafka
```

**Responsibilities:**

- Order creation & lifecycle management
- Saga Orchestrator (distributed transaction coordination)
- Event Sourcing — lưu toàn bộ state changes dưới dạng events
- CQRS — tách read model (optimized queries) và write model (event stream)
- Order state machine (Pending → Confirmed → Preparing → Ready → PickedUp → Delivering → Delivered → Completed)
- Re-order functionality
- Order scheduling (đặt trước)
- Order cancellation & refund orchestration
- Order grouping (nhiều nhà hàng)
- Order notes & special instructions
- ETA calculation
- Order history & analytics projection

**Order State Machine:**

```
                    ┌─────────┐
                    │ CREATED │
                    └────┬────┘
                         │ validate & reserve
                         ▼
                    ┌─────────┐    timeout/cancel
                    │ PENDING │───────────────────┐
                    └────┬────┘                   │
                         │ restaurant accepts     │
                         ▼                        ▼
                  ┌───────────┐             ┌───────────┐
                  │ CONFIRMED │             │ CANCELLED │
                  └─────┬─────┘             └───────────┘
                        │ starts cooking          ▲
                        ▼                         │
                  ┌───────────┐                   │
                  │ PREPARING │───────────────────┘
                  └─────┬─────┘   cancel (with penalty)
                        │ food ready
                        ▼
                    ┌───────┐
                    │ READY │
                    └───┬───┘
                        │ driver picks up
                        ▼
                  ┌───────────┐
                  │ PICKED_UP │
                  └─────┬─────┘
                        │ on the way
                        ▼
                 ┌────────────┐
                 │ DELIVERING │
                 └──────┬─────┘
                        │ arrived
                        ▼
                  ┌───────────┐
                  │ DELIVERED │
                  └─────┬─────┘
                        │ customer confirms / auto after 30min
                        ▼
                  ┌───────────┐
                  │ COMPLETED │
                  └───────────┘
```

**Event Store (MongoDB):**

```json
{
  "stream_id": "order-abc123",
  "version": 5,
  "event_type": "OrderConfirmed",
  "data": { "restaurant_id": "...", "estimated_prep_time": 20 },
  "metadata": { "correlation_id": "...", "causation_id": "...", "user_id": "..." },
  "timestamp": "2026-03-09T10:30:00Z"
}
```

**Read Model (PostgreSQL — CQRS Projection):**

- `orders_read` — denormalized, optimized for queries
- `order_items_read` — flatten items for quick access
- `order_timeline` — status history for UI

**Saga Steps (Orchestrated):**

1. `CreateOrder` → compensation: `CancelOrder`
2. `ValidateRestaurant` → compensation: `NotifyRestaurantCancelled`
3. `ReserveInventory` → compensation: `ReleaseInventory`
4. `ProcessPayment` → compensation: `RefundPayment`
5. `ConfirmOrder` → compensation: `RevertConfirmation`
6. `AssignDriver` → compensation: `UnassignDriver`

**Events Produced:**

- `order.created`
- `order.confirmed`
- `order.preparing`
- `order.ready`
- `order.picked_up`
- `order.delivering`
- `order.delivered`
- `order.completed`
- `order.cancelled`
- `order.refunded`

---

### 3.5 Delivery Service

```
Port: 3004
Database: PostgreSQL + Redis (geospatial)
Transport: RabbitMQ, Redis Pub/Sub
```

**Responsibilities:**

- Driver registration & verification (document upload, background check workflow)
- Driver availability management (online/offline/busy)
- Smart order assignment algorithm (distance, rating, current load, direction)
- Real-time driver location tracking (Redis GEO + WebSocket)
- Route optimization (Mapbox Directions API / OSRM)
- ETA calculation & live updates
- Delivery zone management (geofencing)
- Driver earnings & commission calculation
- Delivery proof (photo upload, OTP verification)
- Batch delivery (multiple orders same direction)
- Driver rating system
- Surge pricing zone detection

**Driver Assignment Algorithm:**

```
Score = w1 * (1/distance) + w2 * rating + w3 * (1/current_load) + w4 * direction_alignment
```

- `distance`: Khoảng cách từ driver đến restaurant (Redis GEODIST)
- `rating`: Driver rating (0-5)
- `current_load`: Số đơn đang giao
- `direction_alignment`: Hướng di chuyển có trùng không (cosine similarity)

**Real-time Tracking Flow:**

```
Driver App → WebSocket → delivery-service → Redis GEO SET
                                           → Redis Pub/Sub → notification-service → Customer WebSocket
                                           → Redis Pub/Sub → order-service (ETA update)
```

**Database Schema:**

- `drivers` — id, user_id, vehicle_type, license_plate, status, current_lat, current_lng, avg_rating
- `driver_documents` — driver_id, type, file_url, verified, verified_at
- `deliveries` — id, order_id, driver_id, status, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, distance_km, actual_duration
- `delivery_tracking` — delivery_id, lat, lng, speed, heading, timestamp (time-series)
- `delivery_zones` — id, name, polygon (PostGIS), surge_multiplier
- `driver_earnings` — driver_id, order_id, base_fee, tip, bonus, commission, net_amount

**Events Produced:**

- `driver.location.updated`
- `delivery.assigned`
- `delivery.picked_up`
- `delivery.completed`
- `delivery.eta.updated`
- `driver.went_online`
- `driver.went_offline`

---

### 3.6 Payment Service

```
Port: 3005
Database: PostgreSQL
Transport: RabbitMQ
```

**Responsibilities:**

- Stripe integration (PaymentIntent, SetupIntent, Customer, PaymentMethod)
- Multiple payment methods (card, wallet, cash on delivery, bank transfer)
- In-app wallet (top-up, balance management)
- Idempotent payment processing (idempotency key pattern)
- Payment state machine (Pending → Processing → Succeeded / Failed → Refunded)
- Split payment (platform fee + restaurant share + driver commission)
- Automatic payout to restaurants & drivers (Stripe Connect)
- Refund management (full, partial)
- Invoice generation (PDF)
- Transaction history
- Fraud detection heuristics (unusual amounts, velocity checks)stream
- Promotion/coupon code redemption

**Idempotency Pattern:**

```
Request → Check idempotency_key in Redis
  → If exists: return cached response (no re-processing)
  → If not: process payment → store result with idempotency_key → return response
```

**Database Schema:**

- `payments` — id, order_id, user_id, amount, currency, method, status, stripe_payment_intent_id, idempotency_key
- `payment_methods` — id, user_id, type, stripe_payment_method_id, last4, is_default
- `wallets` — user_id, balance, currency
- `wallet_transactions` — id, wallet_id, type (credit/debit), amount, reference_id
- `refunds` — id, payment_id, amount, reason, status
- `payouts` — id, recipient_id, recipient_type, amount, stripe_transfer_id, status
- `invoices` — id, order_id, user_id, pdf_url, total, tax

**Events Produced:**

- `payment.processing`
- `payment.succeeded`
- `payment.failed`
- `payment.refunded`
- `payout.completed`
- `wallet.credited`
- `wallet.debited`

---

### 3.7 Notification Service

```
Port: 3006
Database: MongoDB
Transport: RabbitMQ, Redis Pub/Sub, WebSocket
```

**Responsibilities:**

- Multi-channel delivery (Push, Email, SMS, In-app, WebSocket)
- Template management (Handlebars templates, i18n support)
- Notification preferences (user opt-in/out per channel)
- Real-time WebSocket gateway (Socket.IO with Redis adapter for horizontal scaling)
- Push notifications (Firebase Cloud Messaging)
- Email delivery (SendGrid / AWS SES)
- SMS delivery (Twilio)
- Notification scheduling & batching (digest mode)
- Read/unread tracking
- Delivery status tracking (sent, delivered, read, failed)
- Retry mechanism with exponential backoff

**WebSocket Rooms:**

- `user:{userId}` — personal notifications
- `order:{orderId}` — order status updates
- `restaurant:{restaurantId}` — incoming orders
- `driver:{driverId}` — assignment & navigation
- `tracking:{orderId}` — live driver location for customer

**Database Schema (MongoDB):**

```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "type": "ORDER_STATUS | PROMOTION | SYSTEM",
  "channel": "PUSH | EMAIL | SMS | IN_APP | WEBSOCKET",
  "title": "string",
  "body": "string",
  "data": {},
  "status": "PENDING | SENT | DELIVERED | READ | FAILED",
  "read_at": "Date | null",
  "scheduled_at": "Date | null",
  "created_at": "Date"
}
```

**Events Consumed:**

- `order.`\* → notify customer, restaurant, driver
- `payment.*` → notify customer
- `delivery.eta.updated` → notify customer
- `driver.location.updated` → broadcast to tracking room
- `promotion.created` → batch notify eligible users

---

### 3.8 Search Service

```
Port: 3007
Database: Elasticsearch
Transport: TCP, Kafka (indexing)
```

**Responsibilities:**

- Full-text search (restaurant name, dish name, cuisine type)
- Geo-spatial search (restaurants within radius, sorted by distance)
- Autocomplete / typeahead suggestions
- Faceted search (filters: cuisine, price range, rating, delivery time, dietary)
- Search ranking algorithm (relevance + distance + rating + popularity)
- Search analytics (popular queries, trending)
- Synonym handling ("burger" = "hamburger")
- Fuzzy matching (typo tolerance)
- Real-time index updates via Kafka consumers

**Elasticsearch Index Design:**

- `restaurants` — name, cuisine, address, location (geo_point), avg_rating, total_orders, delivery_time, price_range, is_open
- `menu_items` — name, description, price, restaurant_id, restaurant_name, tags, dietary_info

**Events Consumed:**

- `restaurant.created` / `restaurant.updated` → re-index
- `menu.item.updated` → re-index
- `restaurant.rating.updated` → update score

---

### 3.9 Analytics Service

```
Port: 3008
Database: ClickHouse + Redis
Transport: Kafka
```

**Responsibilities:**

- Real-time analytics dashboard (admin)
- Restaurant analytics (orders/day, revenue, popular items, peak hours)
- Platform-wide KPIs (GMV, orders, active users, retention)
- Driver performance analytics
- Customer behavior analytics (order frequency, AOV, churn prediction)
- Funnel analysis (search → restaurant view → add to cart → checkout → order)
- A/B testing metrics collection
- Cohort analysis
- Revenue reporting
- Data export (CSV, PDF)

**ClickHouse Tables:**

- `events` — event_type, user_id, session_id, properties (JSON), timestamp
- `orders_analytics` — order_id, user_id, restaurant_id, total, items_count, delivery_time, timestamp
- `materialized views` — pre-aggregated metrics (hourly, daily)

---

### 3.10 Promotion Service

```
Port: 3009
Database: PostgreSQL + Redis
Transport: RabbitMQ
```

**Responsibilities:**

- Coupon/voucher management (CRUD, bulk generation)
- Promotion rules engine (min order, first order, specific restaurant, time-limited)
- Discount types (percentage, fixed amount, free delivery, buy-1-get-1)
- Usage limits (per user, global limit)
- Promotion stacking rules
- Referral program (refer a friend → both get credit)
- Loyalty points system
- Flash sale management
- Geo-targeted promotions

**Database Schema:**

- `promotions` — id, code, type, value, min_order, max_discount, start_date, end_date, usage_limit, used_count
- `promotion_rules` — promotion_id, rule_type, rule_value
- `user_promotions` — user_id, promotion_id, used_at
- `loyalty_points` — user_id, points, tier (Bronze/Silver/Gold/Platinum)
- `referrals` — referrer_id, referee_id, status, reward_amount

---

### 3.11 Media Service

```
Port: 3010
Database: MinIO (S3-compatible)
Transport: TCP
```

**Responsibilities:**

- Image upload (restaurant photos, menu items, avatars, delivery proof)
- Image processing pipeline (resize, compress, watermark, format conversion)
- CDN integration (signed URLs, cache invalidation)
- Content moderation (basic — file type check, size limit)
- Presigned upload URLs (direct upload từ client → MinIO)

---

### 3.12 Recommendation Service (ML)

```
Port: 3011
Database: Redis (feature store) + PostgreSQL
Transport: Kafka, gRPC
```

**Responsibilities:**

- Personalized restaurant recommendations (collaborative filtering)
- "Frequently ordered together" suggestions
- "You might also like" (content-based filtering)
- Trending & popular near you
- Re-order suggestions based on time of day / day of week
- Search result personalization
- Dynamic home feed curation

**Algorithm Pipeline:**

1. **Data Collection** — user events (view, search, order, rate) from Kafka
2. **Feature Engineering** — user preferences, restaurant features, contextual features
3. **Model** — Lightweight collaborative filtering (matrix factorization) hoặc simple heuristic-based
4. **Serving** — Pre-computed recommendations cached in Redis, updated periodically

---

## 4. Database Design

### Polyglot Persistence Strategy

```
┌────────────────────┬──────────────┬───────────────────────────────┐
│ Data Type          │ Database     │ Reasoning                     │
├────────────────────┼──────────────┼───────────────────────────────┤
│ User accounts      │ PostgreSQL   │ ACID, relations, constraints  │
│ Restaurant & Menu  │ PostgreSQL   │ Structured, relational        │
│ Orders (events)    │ MongoDB      │ Flexible schema, event store  │
│ Orders (read view) │ PostgreSQL   │ CQRS read model, fast queries │
│ Payments           │ PostgreSQL   │ ACID mandatory for financial  │
│ Notifications      │ MongoDB      │ High write, flexible schema   │
│ Search indices     │ Elasticsearch│ Full-text, geo search         │
│ Analytics          │ ClickHouse   │ OLAP, columnar, fast agg      │
│ Sessions & Cache   │ Redis        │ In-memory, TTL               │
│ Driver locations   │ Redis GEO    │ Geospatial, real-time         │
│ Media files        │ MinIO/S3     │ Object storage                │
│ Job queues         │ Redis (Bull) │ Fast, reliable queue          │
└────────────────────┴──────────────┴───────────────────────────────┘
```

### Data Consistency Model

| Consistency  | Where                 | How                                             |
| ------------ | --------------------- | ----------------------------------------------- |
| **Strong**   | Payment processing    | PostgreSQL transactions, Saga with compensation |
| **Eventual** | Order read model      | CQRS projection from event store                |
| **Eventual** | Search index          | Kafka consumer → Elasticsearch                  |
| **Eventual** | Analytics             | Kafka → ClickHouse                              |
| **Strong**   | Inventory reservation | Redis distributed lock + PostgreSQL             |

---

## 5. Advanced Patterns & Concepts

### 5.1 Saga Pattern (Orchestrated)

Order placement saga flow:

```
┌──────────────┐     ┌──────────────┐     ┌───────────────┐
│ Order Service │────▶│ Restaurant   │────▶│  Inventory    │
│ (Orchestrator)│     │ Service      │     │  Reservation  │
└──────┬───────┘     └──────────────┘     └───────┬───────┘
       │                                          │
       │         ┌──────────────┐                 │
       │         │  Payment     │◀────────────────┘
       │         │  Service     │
       │         └──────┬───────┘
       │                │
       │         ┌──────▼───────┐
       │         │  Delivery    │
       └────────▶│  Assignment  │
                 └──────────────┘

Compensation flow (reverse):
Payment Failed → Release Inventory → Cancel Restaurant → Cancel Order → Notify User
```

**Implementation approach:**

- Saga Orchestrator class trong order-service
- Mỗi step là một command gửi qua RabbitMQ
- Mỗi service response qua reply queue
- Timeout handling per step
- Dead letter queue cho failed messages
- Saga state persisted trong MongoDB

### 5.2 Event Sourcing + CQRS

```
WRITE SIDE:                          READ SIDE:

Command → Validate                   Event Store (MongoDB)
        → Produce Event              │
        → Store in Event Store       │ Kafka Connect / Change Stream
        → Publish to Kafka           │
                                     ▼
                                     Kafka Topic
                                     │
                              ┌──────┴──────┐
                              │             │
                              ▼             ▼
                         PostgreSQL    Elasticsearch
                         (Read Model)  (Search Index)
                              │
                              ▼
                         API (Query)
```

**Rebuilding state:**

- Replay events from event store to reconstruct aggregate state
- Snapshots every N events cho performance
- Projection rebuild tool cho read model migration

### 5.3 Circuit Breaker

Custom NestJS decorator-based Circuit Breaker:

```
States: CLOSED → OPEN → HALF_OPEN → CLOSED

CLOSED: Requests pass through, track failures
  → failure_count >= threshold → switch to OPEN

OPEN: Reject all requests immediately (fail fast)
  → after recovery_timeout → switch to HALF_OPEN

HALF_OPEN: Allow limited requests through
  → success_count >= threshold → switch to CLOSED
  → any failure → switch back to OPEN
```

Implement as NestJS interceptor + decorator:

- `@CircuitBreaker({ failureThreshold: 5, recoveryTimeout: 30000 })`
- Health dashboard showing circuit states
- Fallback support (`@Fallback(() => cachedResult)`)

### 5.4 API Gateway Patterns

- **Rate Limiting**: Token bucket algorithm, per-user + per-IP + per-endpoint
- **Request Deduplication**: Idempotency key header check
- **Request Coalescing**: Batch identical concurrent requests
- **Response Caching**: Cache-Control headers, Redis cache
- **Correlation ID**: Inject `X-Correlation-ID` for distributed tracing
- **Request Timeout**: Per-route configurable timeouts
- **Retry Policy**: Configurable retry with exponential backoff

### 5.5 Real-time Architecture

```
                    ┌─────────────────────────────┐
                    │  Socket.IO Gateway (NestJS)  │
                    │  ┌───────────────────────┐   │
                    │  │  Redis Adapter         │   │ ← Horizontal scaling
                    │  │  (Socket.IO + Redis)   │   │
                    │  └───────────────────────┘   │
                    └───────────┬─────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
    ┌─────────▼──────┐ ┌──────▼───────┐ ┌───────▼────────┐
    │ Order Updates   │ │ Location     │ │ Chat/Support   │
    │ Room            │ │ Tracking     │ │ Room           │
    │ order:{id}      │ │ tracking:{id}│ │ chat:{id}      │
    └────────────────┘ └──────────────┘ └────────────────┘
```

**Driver Location Broadcasting (High frequency, 3-5 sec interval):**

1. Driver app sends GPS → WebSocket → delivery-service
2. delivery-service → Redis `GEOADD drivers:active {lng} {lat} {driverId}`
3. delivery-service → Redis Pub/Sub `tracking:{orderId}`
4. notification-service subscribes → broadcasts to customer WebSocket room

### 5.6 Distributed Caching Strategy

```
┌─────────────────────────────────────────────────┐
│                 Cache Layers                      │
│                                                   │
│  L1: In-Memory (NestJS CacheModule, per instance)│
│      TTL: 30s, size: 1000 entries                │
│                                                   │
│  L2: Redis (Shared across instances)             │
│      TTL: 5min-1hr depending on data             │
│                                                   │
│  L3: CDN (Static assets, images)                 │
│      TTL: 24hr, purge on update                  │
│                                                   │
│  L4: Database                                    │
│      Source of truth                              │
└─────────────────────────────────────────────────┘
```

**Cache invalidation strategies:**

- **TTL-based**: Set expiration (most caches)
- **Write-through**: Update cache on write
- **Event-driven invalidation**: Listen for events, invalidate affected keys
- **Cache-aside (Lazy loading)**: Load to cache on miss

### 5.7 Distributed Locking

- **Redis Redlock** for cross-service resource locking
- Use cases:
  - Inventory reservation (prevent overselling)
  - Driver assignment (prevent double-assignment)
  - Coupon usage (prevent race condition on usage count)
  - Idempotent payment processing

---

## 6. Frontend Architecture

### 6.1 App Structure (Monorepo — Turborepo)

```
apps/
├── customer-web/          # Customer-facing Next.js app
├── restaurant-dashboard/  # Restaurant owner dashboard
├── driver-app/           # Driver PWA (mobile-first)
└── admin-panel/          # Internal admin dashboard

packages/
├── ui/                   # Shared Shadcn/ui components
├── api-client/           # Generated API client (OpenAPI → TypeScript)
├── validators/           # Shared Zod schemas (frontend + backend)
├── types/                # Shared TypeScript types
├── config/               # Shared configs (ESLint, Tailwind, TypeScript)
└── utils/                # Shared utility functions
```

### 6.2 Customer Web App — Key Pages

| Route                   | Mô tả                                                  |
| ----------------------- | ------------------------------------------------------ |
| `/`                     | Home — search, categories, recommendations, promotions |
| `/search`               | Search results with filters, map view                  |
| `/restaurant/[slug]`    | Restaurant detail — menu, reviews, info                |
| `/cart`                 | Cart — items, promotions, delivery options             |
| `/checkout`             | Checkout — address, payment, order summary             |
| `/orders`               | Order history — infinite scroll, filters               |
| `/orders/[id]`          | Order detail — real-time status, live map tracking     |
| `/orders/[id]/tracking` | Full-screen live tracking with driver location         |
| `/account`              | Profile, addresses, payment methods, preferences       |
| `/account/wallet`       | Wallet balance, top-up, transaction history            |
| `/favorites`            | Saved restaurants & dishes                             |
| `/promotions`           | Available promotions & vouchers                        |
| `/auth/login`           | Login (email, phone, social)                           |
| `/auth/register`        | Registration flow                                      |

### 6.3 Restaurant Dashboard — Key Pages

| Route                   | Mô tả                                                |
| ----------------------- | ---------------------------------------------------- |
| `/dashboard`            | Overview — today's orders, revenue, ratings          |
| `/dashboard/orders`     | Live order management (accept/reject, status update) |
| `/dashboard/menu`       | Menu editor (drag-drop categories, CRUD items)       |
| `/dashboard/inventory`  | Stock management, alerts                             |
| `/dashboard/analytics`  | Charts — revenue, orders, popular items, peak hours  |
| `/dashboard/reviews`    | Customer reviews, respond to reviews                 |
| `/dashboard/settings`   | Restaurant info, hours, delivery zones               |
| `/dashboard/promotions` | Create restaurant-specific promotions                |

### 6.4 Driver App (PWA) — Key Screens

| Route                       | Mô tả                                          |
| --------------------------- | ---------------------------------------------- |
| `/`                         | Home — go online/offline, earnings today       |
| `/orders/available`         | Available orders nearby with earnings estimate |
| `/orders/active`            | Active delivery — navigation, status updates   |
| `/orders/active/navigation` | Full-screen map with turn-by-turn              |
| `/earnings`                 | Earnings history, weekly summary               |
| `/profile`                  | Driver profile, documents, vehicle info        |

### 6.5 Admin Panel — Key Pages

| Route                | Mô tả                                |
| -------------------- | ------------------------------------ |
| `/admin`             | Dashboard — KPIs, live stats, alerts |
| `/admin/users`       | User management — search, ban, roles |
| `/admin/restaurants` | Restaurant approval, management      |
| `/admin/drivers`     | Driver verification, management      |
| `/admin/orders`      | Order monitoring, dispute resolution |
| `/admin/analytics`   | Platform analytics (Recharts/Tremor) |
| `/admin/promotions`  | Global promotion management          |
| `/admin/settings`    | Platform settings, configuration     |

### 6.6 Frontend Patterns

- **Optimistic Updates**: Cart operations, favorites, ratings update UI immediately, rollback on error
- **Infinite Scroll**: Order history, search results (TanStack Query `useInfiniteQuery`)
- **Skeleton Loading**: Shadcn Skeleton cho every async data fetch
- **Error Boundaries**: Per-route error.tsx, per-component ErrorBoundary
- **Offline Support**: Service Worker cho PWA driver app, IndexedDB for offline data
- **Real-time Updates**: Socket.IO hooks (`useSocket`, `useOrderTracking`, `useDriverLocation`)
- **Form Handling**: React Hook Form + Zod schemas shared with backend
- **Image Optimization**: next/image with blur placeholders, lazy loading
- **Code Splitting**: Dynamic imports cho heavy components (Map, Charts)
- **Responsive Design**: Mobile-first, breakpoints: sm(640) md(768) lg(1024) xl(1280)

---

## 7. Infrastructure & DevOps

### 7.1 Docker Compose (Local Development)

```yaml
services:
  # --- Databases ---
  postgres: # Port 5432
  mongodb: # Port 27017
  redis: # Port 6379
  elasticsearch: # Port 9200
  clickhouse: # Port 8123
  minio: # Port 9000 (API), 9001 (Console)

  # --- Message Brokers ---
  rabbitmq: # Port 5672 (AMQP), 15672 (Management)
  kafka: # Port 9092
  zookeeper: # Port 2181

  # --- Services ---
  api-gateway: # Port 3000
  user-service: # Port 3001
  restaurant-service: # Port 3002
  order-service: # Port 3003
  delivery-service: # Port 3004
  payment-service: # Port 3005
  notification-service: # Port 3006
  search-service: # Port 3007
  analytics-service: # Port 3008
  promotion-service: # Port 3009
  media-service: # Port 3010
  recommendation-service: # Port 3011

  # --- Frontend ---
  customer-web: # Port 4000
  restaurant-dashboard: # Port 4001
  driver-app: # Port 4002
  admin-panel: # Port 4003

  # --- Monitoring ---
  prometheus: # Port 9090
  grafana: # Port 3100
  jaeger: # Port 16686
  kibana: # Port 5601
```

### 7.2 CI/CD Pipeline (GitHub Actions)

```
Push/PR → Lint & Format Check
        → Unit Tests (per service, parallel)
        → Integration Tests (with Docker Compose)
        → Build Docker Images
        → Push to Registry (GitHub Container Registry)
        → Deploy to Staging (auto on develop branch)
        → E2E Tests on Staging
        → Deploy to Production (manual approval on main)
```

**Pipeline stages:**

1. **Code Quality**: ESLint, Prettier, TypeScript strict check
2. **Unit Tests**: Jest (backend), Vitest (frontend), coverage threshold 80%
3. **Integration Tests**: Testcontainers (real DB, real Redis, real RabbitMQ)
4. **Build**: Multi-stage Docker builds (optimized image size)
5. **Security Scan**: Trivy (container vulnerability), npm audit
6. **Deploy**: Docker Compose (staging) / Kubernetes (production)

### 7.3 Environment Strategy

| Environment    | Infra                                  | Deploy                 |
| -------------- | -------------------------------------- | ---------------------- |
| **Local**      | Docker Compose                         | `docker compose up`    |
| **Staging**    | Docker Compose on VPS                  | Auto on `develop` push |
| **Production** | Kubernetes (optional) / Docker Compose | Manual on `main` tag   |

---

## 8. Monitoring & Observability

### 8.1 Three Pillars

**Metrics (Prometheus + Grafana):**

- Request rate, latency (p50, p95, p99), error rate per service
- Business metrics: orders/min, GMV, active users
- Infrastructure: CPU, memory, disk, network per container
- Custom metrics: Saga completion rate, circuit breaker state, cache hit ratio

**Logs (ELK Stack):**

- Structured JSON logs (Winston / Pino)
- Correlation ID across services
- Log levels: error, warn, info, debug
- Log aggregation in Elasticsearch, visualized in Kibana

**Traces (Jaeger + OpenTelemetry):**

- Distributed request tracing across microservices
- Span-level timing for each service call
- Auto-instrumentation with nestjs-otel
- Trace context propagation via headers

### 8.2 Alerting Rules

| Alert                 | Condition               | Severity |
| --------------------- | ----------------------- | -------- |
| High error rate       | >5% 5xx in 5min         | CRITICAL |
| High latency          | p99 > 5s for 5min       | WARNING  |
| Service down          | Health check failed 3x  | CRITICAL |
| Circuit breaker open  | Any circuit open > 2min | WARNING  |
| Low disk space        | < 10% free              | WARNING  |
| Order saga timeout    | Saga > 60s              | WARNING  |
| Payment failure spike | > 10% failed in 10min   | CRITICAL |

### 8.3 Health Check Endpoints

Mỗi service expose:

- `GET /health` — liveness (service is running)
- `GET /health/ready` — readiness (dependencies connected)
- Response includes: status, uptime, dependencies status, version

---

## 9. Testing Strategy

### 9.1 Testing Pyramid

```
           ┌───────────┐
           │   E2E     │  ← 10% (Playwright / Cypress)
           │  Tests    │     Critical user flows
          ┌┴───────────┴┐
          │ Integration  │  ← 30% (Testcontainers, Supertest)
          │   Tests      │     API + DB + Broker
         ┌┴──────────────┴┐
         │   Unit Tests    │  ← 60% (Jest / Vitest)
         │                 │     Business logic, utils
         └─────────────────┘
```

### 9.2 Backend Testing

**Unit Tests (Jest):**

- Service layer business logic
- Saga orchestrator (mock message broker)
- Circuit breaker state machine
- Validation DTOs
- Event handlers

**Integration Tests (Testcontainers):**

- Full API endpoint tests with real database
- Message broker integration (RabbitMQ, Kafka)
- Cache layer (Redis)
- Event Sourcing (write event, rebuild state)
- Saga flow (happy path + compensation)

**Contract Tests (Pact):**

- Consumer-driven contracts between services
- API Gateway ↔ Service contracts
- Event schema contracts

### 9.3 Frontend Testing

**Unit Tests (Vitest + Testing Library):**

- Component rendering
- Hook behavior
- State management
- Utility functions

**Integration Tests (Vitest):**

- Page-level rendering with mock API
- Form submission flows
- WebSocket event handling

**E2E Tests (Playwright):**

- Customer order flow (search → order → track)
- Restaurant order management
- Payment flow
- Real-time tracking visualization

**Visual Regression (Chromatic / Percy):**

- Storybook-based screenshot comparison
- Detect unintended UI changes

### 9.4 Load Testing

**k6 / Artillery:**

- Target: 1000 concurrent users
- Order creation throughput
- WebSocket connection scaling
- Search query performance
- Payment processing under load

---

## 10. Security

### 10.1 Authentication & Authorization

- **JWT** with short-lived access tokens (15min) + long-lived refresh tokens (7d)
- **Refresh token rotation**: New refresh token on each use, old one invalidated
- **Token blacklisting**: Redis set for revoked tokens
- **OAuth2**: Google, Facebook, Apple Sign-In
- **2FA**: TOTP (authenticator app) + SMS OTP fallback
- **RBAC**: Roles (customer, driver, restaurant_owner, admin) with permissions matrix
- **ABAC**: Attribute-based rules (e.g., restaurant owner can only edit own restaurant)
- **API Key**: For service-to-service communication + external integrations

### 10.2 Data Security

- **Encryption at rest**: Database encryption (PostgreSQL TDE, MongoDB encryption)
- **Encryption in transit**: TLS 1.3 everywhere
- **Password hashing**: bcrypt (cost factor 12)
- **PII handling**: Encrypt sensitive fields (phone, email) in database
- **Data masking**: Mask sensitive data in logs
- **Input validation**: class-validator on all DTOs, Zod on frontend
- **SQL injection prevention**: TypeORM parameterized queries
- **XSS prevention**: Content Security Policy headers, output encoding
- **CSRF protection**: SameSite cookies, CSRF tokens

### 10.3 Infrastructure Security

- **Rate limiting**: Per-user, per-IP, per-endpoint (Token Bucket)
- **DDoS protection**: Nginx rate limiting + fail2ban
- **Secrets management**: Environment variables, Vault for sensitive configs
- **Container security**: Non-root containers, read-only filesystem, security scanning
- **Network policies**: Service-to-service communication restricted
- **CORS**: Strict origin whitelist
- **Helmet**: Security headers middleware

---

## 11. Phân pha triển khai (Phases)

### Phase 0: Foundation & Setup (Tuần 1-2)

**Mục tiêu**: Thiết lập monorepo, infrastructure cơ bản, CI/CD pipeline.

- Khởi tạo Turborepo monorepo structure
- Setup `packages/ui` — cài đặt Shadcn/ui, Tailwind config, base components
- Setup `packages/types` — shared TypeScript interfaces
- Setup `packages/validators` — shared Zod schemas
- Setup `packages/config` — shared ESLint, Prettier, tsconfig
- Tạo NestJS workspace cho backend services (Nx hoặc NestJS monorepo mode)
- Setup Docker Compose cho infrastructure (PostgreSQL, MongoDB, Redis, RabbitMQ)
- Setup Docker Compose cho Elasticsearch, MinIO, Kafka
- Dockerfile cho mỗi service (multi-stage build)
- GitHub Actions CI pipeline (lint, test, build)
- Setup Husky + lint-staged (pre-commit hooks)
- Setup commitlint (conventional commits)
- README.md với setup instructions

**Deliverables**: Monorepo chạy được, docker compose up → tất cả infra sẵn sàng.

---

### Phase 1: User Service + Auth + Customer Web Shell (Tuần 3-4)

**Mục tiêu**: Nền tảng authentication hoàn chỉnh, customer web app shell.

**Backend:**

- User Service — NestJS module setup
- PostgreSQL schema + TypeORM entities (users, profiles, addresses, devices)
- Registration endpoint (email + phone)
- Login endpoint (JWT access + refresh token)
- Refresh token rotation logic
- Token blacklisting (Redis)
- OAuth2 integration (Google login)
- Password reset flow (email OTP)
- Profile CRUD
- Address management (CRUD, set default, geocoding integration)
- Swagger documentation
- Unit tests cho auth logic
- Integration tests (Supertest + real DB)

**Frontend (Customer Web):**

- Next.js App Router setup
- Shadcn/ui installation + theme configuration
- Layout — Navbar, Footer, MobileNav
- Auth pages — Login, Register, Forgot Password
- Social login buttons (Google)
- Protected route middleware (Next.js middleware.ts)
- Profile page — view & edit
- Address management page
- API client setup (Axios + interceptors + token refresh)
- Zustand auth store
- TanStack Query setup + auth hooks
- Dark/Light mode toggle
- Responsive design foundation
- Loading states (Shadcn Skeleton)

**Deliverables**: User có thể register, login, manage profile, manage addresses.

---

### Phase 2: Restaurant Service + Search + Discovery (Tuần 5-7)

**Mục tiêu**: Restaurant management, menu system, search & discovery.

**Backend:**

- Restaurant Service — NestJS module
- PostgreSQL schema (restaurants, menu categories, items, variants, addons, reviews)
- Restaurant CRUD + approval workflow
- Menu management API (categories, items, variants, addons)
- Inventory tracking logic
- Operating hours management
- Restaurant image upload (Media Service integration)
- Search Service — NestJS module
- Elasticsearch setup + index mapping
- Full-text search API (restaurant + menu items)
- Geo-spatial search (restaurants within radius)
- Autocomplete/typeahead endpoint
- Faceted filters (cuisine, price, rating, delivery time)
- Kafka consumer cho real-time indexing
- Media Service — basic image upload + presigned URL
- Unit + integration tests

**Frontend (Customer Web):**

- Home page — search bar, cuisine categories, promotions banner, recommendations section
- Search page — results list + map view toggle, filters sidebar, sort options
- Restaurant detail page — header, menu tabs, item cards, reviews section
- Menu item modal — variants selector, addons, quantity, add to cart
- Infinite scroll cho search results
- Skeleton loading cho all data-fetching components
- Geolocation permission + address auto-detect
- Map integration (Mapbox/Leaflet) cho search results

**Frontend (Restaurant Dashboard — Shell):**

- Dashboard layout — sidebar navigation, header
- Menu management page — CRUD categories & items, drag-drop sort
- Restaurant profile editor
- Operating hours editor

**Deliverables**: Customer có thể search restaurants, view menus. Restaurant owner có thể manage menu.

---

### Phase 3: Order Service + Cart + Checkout (Tuần 8-10)

**Mục tiêu**: Hoàn thiện order flow, Event Sourcing, CQRS, Saga Pattern.

**Backend:**

- Order Service — NestJS module
- MongoDB Event Store setup
- Event Sourcing implementation (append-only event stream)
- Order aggregate (rebuild state from events)
- Snapshot mechanism (every 50 events)
- CQRS read model projections (PostgreSQL)
- Order state machine implementation
- Saga Orchestrator class
  - Step 1: CreateOrder
  - Step 2: ValidateRestaurant (check open, items available)
  - Step 3: ReserveInventory (decrement stock)
  - Step 4: ProcessPayment (charge customer)
  - Step 5: ConfirmOrder
  - Step 6: AssignDriver
- Compensation logic cho mỗi step (rollback)
- Saga timeout handling
- Dead letter queue cho failed saga steps
- RabbitMQ integration (command bus)
- Kafka integration (event publishing)
- Order cancellation flow
- Re-order endpoint
- Order history (CQRS read model query)
- Cart Service (stateless, Redis-backed session cart)
- Unit tests cho Saga orchestrator
- Integration tests cho full order flow

**Frontend (Customer Web):**

- Cart drawer/page — item list, quantity controls, subtotal
- Promo code input in cart
- Checkout page — delivery address, payment method selection, order notes
- Order summary component
- Order confirmation page (animated success)
- Order history page — list with filters, infinite scroll
- Order detail page — timeline, items, pricing breakdown
- Optimistic cart updates (Zustand + TanStack Query)
- Re-order button functionality

**Frontend (Restaurant Dashboard):**

- Live orders page — incoming orders with accept/reject
- Order status management (confirm → preparing → ready)
- Audio notification cho new orders
- Order history + filters

**Deliverables**: Full order flow from cart → checkout → payment → confirmation. CQRS + Event Sourcing working.

---

### Phase 4: Payment Service + Stripe (Tuần 11-12)

**Mục tiêu**: Production-grade payment processing.

**Backend:**

- Payment Service — NestJS module
- Stripe integration (PaymentIntent flow)
- Idempotency key implementation (Redis-backed)
- Payment method management (save card via Stripe SetupIntent)
- Wallet system (in-app balance, top-up, debit)
- Split payment logic (platform fee, restaurant share, driver commission)
- Refund processing (full + partial)
- Stripe webhook handler (payment confirmation)
- Invoice generation (PDF via puppeteer/pdfkit)
- Transaction history API
- Fraud detection heuristics (velocity check, amount anomaly)
- Unit tests cho payment logic
- Integration tests (Stripe test mode)

**Frontend (Customer Web):**

- Payment method management — add card (Stripe Elements), set default, remove
- Wallet page — balance, top-up, transaction history
- Checkout payment selection (card, wallet, COD)
- Payment processing states (loading, success, failure)
- Invoice download

**Deliverables**: Stripe payment working end-to-end. Wallet system. Idempotent payments.

---

### Phase 5: Delivery Service + Real-time Tracking (Tuần 13-15)

**Mục tiêu**: Driver management, real-time tracking, WebSocket infrastructure.

**Backend:**

- Delivery Service — NestJS module
- Driver registration + document upload
- Driver availability management (online/offline)
- Smart order assignment algorithm
- Redis GEO for driver location storage
- Real-time location update endpoint (WebSocket)
- ETA calculation (distance + traffic estimation)
- Delivery zone management (PostGIS polygon)
- Driver earnings calculation
- Delivery proof (photo + OTP)
- Notification Service — NestJS module
- Socket.IO Gateway with Redis adapter
- Room management (order rooms, tracking rooms, user rooms)
- Redis Pub/Sub integration for cross-service real-time events
- Push notification (Firebase Cloud Messaging)
- Email notifications (SendGrid/Nodemailer templates)
- SMS notifications (Twilio)
- Notification preferences API
- In-app notification history
- BullMQ job queue cho async notification delivery
- Circuit Breaker implementation (NestJS interceptor)
- Apply to all inter-service HTTP calls
- Health dashboard endpoint for circuit states
- Unit + integration tests

**Frontend (Customer Web):**

- Order tracking page — real-time order status timeline
- Live map tracking — driver location on map (Mapbox/Leaflet), auto-center, smooth animation
- ETA display (auto-updating)
- Driver info card (name, photo, vehicle, rating, phone)
- Contact driver (call/chat)
- Notification bell — in-app notification dropdown, unread count
- Push notification permission request + handler

**Frontend (Driver App — PWA):**

- Driver app setup (Next.js PWA with next-pwa)
- Go online/offline toggle
- Available orders list (with map showing pickup/dropoff)
- Accept/decline order
- Active delivery screen — step-by-step status updates
- Navigation view — map with route, turn-by-turn
- Delivery completion — photo upload, OTP verification
- Earnings page — today, this week, history
- Background location tracking (Service Worker + Geolocation API)
- Offline support (queue location updates, sync when online)

**Deliverables**: Full delivery flow. Real-time tracking on map. Push/email/SMS notifications.

---

### Phase 6: API Gateway + Advanced Infrastructure (Tuần 16-17)

**Mục tiêu**: Production-ready gateway, service mesh, resilience.

**Backend:**

- API Gateway Service — NestJS app
- Request routing (proxy to microservices)
- JWT authentication guard (verify + decode)
- Rate limiting (Token Bucket, per-user + per-IP)
- Request logging + Correlation ID injection
- Response caching (Redis, GET requests)
- Request/Response transformation
- API versioning support
- Circuit breaker for downstream calls
- GraphQL Federation Gateway (Apollo Federation)
  - User subgraph
  - Restaurant subgraph
  - Order subgraph
- WebSocket proxy
- Health check aggregation
- Swagger aggregation (combine all service specs)

**Infrastructure:**

- Distributed tracing setup (OpenTelemetry + Jaeger)
- Instrument all NestJS services
- Trace context propagation
- Centralized logging (ELK Stack via Docker Compose)
- Winston structured JSON logging in all services
- Logstash pipeline configuration
- Kibana dashboards
- Prometheus metrics collection
- NestJS metrics middleware (request duration, error count)
- Custom business metrics
- Grafana dashboards (pre-configured)
- Alerting rules
- Health check endpoints for all services (/health, /health/ready)

**Deliverables**: Single entry point. Full observability. Resilience patterns working.

---

### Phase 7: Analytics + Promotions + Recommendations (Tuần 18-19)

**Mục tiêu**: Business intelligence, engagement features.

**Backend:**

- Analytics Service — NestJS module
- ClickHouse setup + schema
- Kafka consumer → ClickHouse ingestion
- Pre-aggregated materialized views
- Analytics query API (date range, group by, filters)
- Export endpoint (CSV)
- Promotion Service — NestJS module
- Coupon CRUD + validation rules engine
- Referral program logic
- Loyalty points system
- Redis-backed usage tracking (race condition safe)
- Recommendation Service
- User behavior event collection (Kafka)
- Collaborative filtering (basic matrix factorization)
- Trending & popular algorithm
- Pre-computed recommendations (Redis cache)
- Recommendation API endpoint

**Frontend (Customer Web):**

- Promotions page — available vouchers, referral code
- Apply promotion in checkout
- Loyalty points display + tier badge
- Personalized recommendations section on home
- "Trending near you" section
- "Order again" section (based on history)

**Frontend (Restaurant Dashboard):**

- Analytics dashboard — revenue chart, orders chart, popular items, peak hours
- Customer insights — repeat customers, avg order value
- Create restaurant promotions

**Frontend (Admin Panel):**

- Admin panel setup (Next.js + Shadcn)
- Platform KPI dashboard (GMV, orders, users, drivers)
- User management — search, view, ban/unban, role assignment
- Restaurant management — approval queue, status management
- Driver management — verification queue
- Order monitoring — live feed, dispute resolution
- Promotion management — global promos CRUD
- System health dashboard — service status, circuit breaker states

**Deliverables**: Analytics dashboards. Promotion engine. Admin panel. Recommendations.

---

### Phase 8: Polish, Testing & Documentation (Tuần 20-21)

**Mục tiêu**: Production-quality polish, comprehensive testing, documentation.

**Testing:**

- Unit test coverage > 80% (all services)
- Integration test suite (all API endpoints)
- Saga flow tests (happy path + all compensation paths)
- E2E tests (Playwright) — full customer order flow
- E2E tests — restaurant order management flow
- E2E tests — driver delivery flow
- Load testing (k6) — 1000 concurrent users simulation
- Security audit — OWASP Top 10 checklist
- Contract tests (Pact) — key service contracts

**Frontend Polish:**

- Animation pass — page transitions (Framer Motion), micro-interactions
- Accessibility audit (WCAG 2.1 AA) — keyboard navigation, screen reader, contrast
- Performance optimization — Lighthouse score > 90 all categories
- SEO optimization — metadata, structured data, sitemap
- i18n — Vietnamese + English
- Error handling pass — all error states have proper UI
- Empty states — all empty lists have helpful illustrations
- Toast notifications (Sonner) — consistent feedback
- Responsive pass — test all breakpoints
- Dark mode pass — all components correct in dark mode

**Documentation:**

- README.md — project overview, architecture diagram, quick start
- ARCHITECTURE.md — detailed system design document
- API documentation (Swagger) — all endpoints documented
- GraphQL schema documentation
- Database schema documentation (dbdocs.io hoặc diagrams)
- Deployment guide
- Contributing guide
- Storybook deployment (UI component showcase)
- Postman collection (all API endpoints)

**DevOps:**

- Docker images optimized (multi-stage, < 200MB mỗi service)
- Docker Compose production config (resource limits, restart policies)
- Environment variable documentation
- Database migration scripts
- Seed data script (demo data)
- One-command setup (`make setup` hoặc script)

**Deliverables**: Production-ready codebase. Full test suite. Comprehensive documentation.

---

## 12. Folder Structure

```
grab/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Lint, test, build
│   │   ├── cd-staging.yml            # Deploy to staging
│   │   └── cd-production.yml         # Deploy to production
│   └── PULL_REQUEST_TEMPLATE.md
│
├── apps/
│   ├── customer-web/                  # Next.js 15 — Customer app
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (main)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx           # Home
│   │   │   │   ├── search/page.tsx
│   │   │   │   ├── restaurant/[slug]/page.tsx
│   │   │   │   ├── cart/page.tsx
│   │   │   │   ├── checkout/page.tsx
│   │   │   │   ├── orders/page.tsx
│   │   │   │   ├── orders/[id]/page.tsx
│   │   │   │   ├── orders/[id]/tracking/page.tsx
│   │   │   │   ├── account/page.tsx
│   │   │   │   ├── account/wallet/page.tsx
│   │   │   │   ├── favorites/page.tsx
│   │   │   │   └── promotions/page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── stores/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   ├── restaurant-dashboard/          # Next.js — Restaurant dashboard
│   │   ├── app/
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx
│   │   │       ├── orders/page.tsx
│   │   │       ├── menu/page.tsx
│   │   │       ├── inventory/page.tsx
│   │   │       ├── analytics/page.tsx
│   │   │       ├── reviews/page.tsx
│   │   │       └── settings/page.tsx
│   │   └── package.json
│   │
│   ├── driver-app/                    # Next.js PWA — Driver app
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── orders/
│   │   │   ├── earnings/page.tsx
│   │   │   └── profile/page.tsx
│   │   └── package.json
│   │
│   └── admin-panel/                   # Next.js — Admin dashboard
│       ├── app/
│       │   └── admin/
│       │       ├── layout.tsx
│       │       ├── page.tsx
│       │       ├── users/page.tsx
│       │       ├── restaurants/page.tsx
│       │       ├── drivers/page.tsx
│       │       ├── orders/page.tsx
│       │       ├── analytics/page.tsx
│       │       ├── promotions/page.tsx
│       │       └── settings/page.tsx
│       └── package.json
│
├── services/                           # NestJS Backend Services
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts
│   │   │   │   └── rate-limit.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── circuit-breaker.interceptor.ts
│   │   │   │   ├── logging.interceptor.ts
│   │   │   │   └── cache.interceptor.ts
│   │   │   ├── filters/
│   │   │   │   └── global-exception.filter.ts
│   │   │   ├── proxy/
│   │   │   │   └── service-proxy.module.ts
│   │   │   └── graphql/
│   │   │       └── gateway.module.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── user-service/
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── strategies/
│   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   ├── google.strategy.ts
│   │   │   │   │   └── refresh-token.strategy.ts
│   │   │   │   ├── guards/
│   │   │   │   └── dto/
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── entities/
│   │   │   │   │   ├── user.entity.ts
│   │   │   │   │   ├── user-profile.entity.ts
│   │   │   │   │   └── user-address.entity.ts
│   │   │   │   └── dto/
│   │   │   └── common/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── restaurant-service/
│   │   ├── src/
│   │   │   ├── restaurants/
│   │   │   ├── menu/
│   │   │   ├── inventory/
│   │   │   ├── reviews/
│   │   │   └── common/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── order-service/
│   │   ├── src/
│   │   │   ├── commands/              # CQRS Write side
│   │   │   │   ├── create-order.command.ts
│   │   │   │   └── handlers/
│   │   │   ├── queries/               # CQRS Read side
│   │   │   │   ├── get-order.query.ts
│   │   │   │   └── handlers/
│   │   │   ├── events/                # Event Sourcing
│   │   │   │   ├── order-created.event.ts
│   │   │   │   ├── order-confirmed.event.ts
│   │   │   │   └── store/
│   │   │   │       └── event-store.service.ts
│   │   │   ├── sagas/                 # Saga Orchestration
│   │   │   │   ├── order-fulfillment.saga.ts
│   │   │   │   ├── steps/
│   │   │   │   │   ├── validate-restaurant.step.ts
│   │   │   │   │   ├── reserve-inventory.step.ts
│   │   │   │   │   ├── process-payment.step.ts
│   │   │   │   │   └── assign-driver.step.ts
│   │   │   │   └── saga-orchestrator.service.ts
│   │   │   ├── projections/           # CQRS Projections
│   │   │   │   └── order-read-model.projection.ts
│   │   │   ├── aggregates/
│   │   │   │   └── order.aggregate.ts
│   │   │   └── cart/
│   │   │       └── cart.service.ts     # Redis-backed cart
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── delivery-service/
│   │   ├── src/
│   │   │   ├── drivers/
│   │   │   ├── deliveries/
│   │   │   ├── tracking/
│   │   │   │   ├── tracking.gateway.ts  # WebSocket
│   │   │   │   └── location.service.ts  # Redis GEO
│   │   │   ├── assignment/
│   │   │   │   └── assignment-algorithm.service.ts
│   │   │   └── zones/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── payment-service/
│   │   ├── src/
│   │   │   ├── payments/
│   │   │   ├── wallet/
│   │   │   ├── stripe/
│   │   │   │   ├── stripe.service.ts
│   │   │   │   └── webhook.controller.ts
│   │   │   ├── invoices/
│   │   │   └── idempotency/
│   │   │       └── idempotency.service.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── notification-service/
│   │   ├── src/
│   │   │   ├── gateway/
│   │   │   │   └── notification.gateway.ts  # Socket.IO
│   │   │   ├── channels/
│   │   │   │   ├── push.service.ts
│   │   │   │   ├── email.service.ts
│   │   │   │   ├── sms.service.ts
│   │   │   │   └── websocket.service.ts
│   │   │   ├── templates/
│   │   │   └── preferences/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── search-service/
│   │   ├── src/
│   │   │   ├── indexing/
│   │   │   ├── search/
│   │   │   └── suggestions/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── analytics-service/
│   │   ├── src/
│   │   │   ├── ingestion/
│   │   │   ├── queries/
│   │   │   └── exports/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── promotion-service/
│   │   ├── src/
│   │   │   ├── coupons/
│   │   │   ├── referrals/
│   │   │   ├── loyalty/
│   │   │   └── rules-engine/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── media-service/
│   │   ├── src/
│   │   │   ├── upload/
│   │   │   └── processing/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── recommendation-service/
│       ├── src/
│       │   ├── collection/
│       │   ├── engine/
│       │   └── serving/
│       ├── Dockerfile
│       └── package.json
│
├── packages/                           # Shared packages
│   ├── ui/                            # Shadcn/ui shared components
│   │   ├── src/
│   │   │   └── components/
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   ├── types/                         # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── user.types.ts
│   │   │   ├── order.types.ts
│   │   │   ├── restaurant.types.ts
│   │   │   └── events.types.ts
│   │   └── package.json
│   ├── validators/                    # Shared Zod schemas
│   │   ├── src/
│   │   └── package.json
│   ├── api-client/                    # Generated API client
│   │   └── package.json
│   ├── config/                        # Shared configs
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── tailwind/
│   └── utils/                         # Shared utilities
│       └── package.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml         # Full stack local dev
│   │   ├── docker-compose.infra.yml   # Infrastructure only
│   │   ├── docker-compose.monitoring.yml
│   │   └── docker-compose.prod.yml
│   ├── k8s/                           # Kubernetes manifests (optional)
│   │   ├── namespaces/
│   │   ├── deployments/
│   │   ├── services/
│   │   ├── configmaps/
│   │   └── ingress/
│   ├── monitoring/
│   │   ├── prometheus/
│   │   │   └── prometheus.yml
│   │   ├── grafana/
│   │   │   └── dashboards/
│   │   ├── jaeger/
│   │   └── elk/
│   │       ├── logstash.conf
│   │       └── kibana/
│   ├── nginx/
│   │   └── nginx.conf
│   └── scripts/
│       ├── setup.sh                   # One-command setup
│       ├── seed.ts                    # Database seeding
│       └── migrate.sh                 # Run all migrations
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── CONTRIBUTING.md
│   └── diagrams/
│       ├── system-architecture.png
│       ├── order-saga-flow.png
│       ├── cqrs-event-sourcing.png
│       └── database-schema.png
│
├── turbo.json                         # Turborepo config
├── package.json                       # Root package.json
├── pnpm-workspace.yaml                # pnpm workspace
├── .env.example
├── .gitignore
├── Makefile                           # Shortcuts (make setup, make dev, make test)
├── README.md
└── scope.md                           # This file
```

---

## Tóm tắt Concepts được cover

| Concept                        | Implementation                                                 |
| ------------------------------ | -------------------------------------------------------------- |
| **Microservices Architecture** | 12 independent NestJS services                                 |
| **Saga Pattern**               | Orchestrated saga trong order-service                          |
| **Event Sourcing**             | MongoDB event store, event replay, snapshots                   |
| **CQRS**                       | Separate write (events) & read (PostgreSQL projections) models |
| **API Gateway**                | Custom NestJS gateway với routing, auth, rate limiting         |
| **GraphQL Federation**         | Apollo Federation merging subgraphs                            |
| **WebSocket Real-time**        | Socket.IO + Redis adapter cho horizontal scaling               |
| **Redis Pub/Sub**              | Real-time driver tracking broadcast                            |
| **Circuit Breaker**            | Custom interceptor, health dashboard                           |
| **Distributed Tracing**        | OpenTelemetry + Jaeger                                         |
| **Event-Driven Architecture**  | RabbitMQ (commands) + Kafka (events)                           |
| **Polyglot Persistence**       | PostgreSQL + MongoDB + Redis + Elasticsearch + ClickHouse      |
| **Distributed Caching**        | Multi-layer: In-memory → Redis → CDN                           |
| **Distributed Locking**        | Redis Redlock (inventory, assignment)                          |
| **Idempotency**                | Redis-backed idempotency keys cho payments                     |
| **Background Jobs**            | BullMQ queue (notifications, reports, analytics)               |
| **Full-text Search**           | Elasticsearch với geo-spatial, autocomplete, facets            |
| **Recommendation Engine**      | Collaborative filtering + heuristic-based                      |
| **Analytics Pipeline**         | Kafka → ClickHouse → materialized views                        |
| **OAuth2 / JWT**               | Multi-strategy auth, token rotation, blacklisting              |
| **RBAC + ABAC**                | Role & attribute-based access control                          |
| **Monorepo**                   | Turborepo + pnpm workspaces                                    |
| **CI/CD**                      | GitHub Actions multi-stage pipeline                            |
| **Containerization**           | Docker multi-stage builds, Docker Compose                      |
| **Infrastructure as Code**     | Kubernetes manifests, Helm (optional)                          |
| **Monitoring & Observability** | Prometheus + Grafana + ELK + Jaeger                            |
| **PWA**                        | Driver app with offline support, background sync               |
| **Internationalization**       | next-intl (Vietnamese + English)                               |
| **Responsive Design**          | Mobile-first, Tailwind breakpoints                             |
| **Accessibility**              | WCAG 2.1 AA compliance                                         |

---

> **Estimated Timeline**: 20-21 tuần (~5 tháng) cho full implementation
>
> **MVP Timeline**: Phase 0-5 (~15 tuần) cho core functionality
>
> **Recommended approach**: Hoàn thành theo phase, mỗi phase có thể demo được. Ưu tiên Phase 0-3 trước (foundation + core order flow) vì đây là phần ấn tượng nhất cho CV.
