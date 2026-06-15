# Phase 4 — Payment Service + Stripe (Self-Build Guide)

> **You are doing this phase by hand.** The previous three phases were largely auto-generated ("vibe code"). This guide breaks Phase 4 into **small, commit-sized tasks**. Do them in order. Each task ends in **one commit** that leaves the repo green (build + lint + tests pass).
>
> Goal of the phase: **a real Stripe-backed Payment Service** that (1) the customer can call from the web app, (2) the **order saga** calls to actually charge for an order, plus an **in-app wallet**, **refunds**, **invoices**, and **payouts**.

---

## 0. Before you start (read this once)

### 0.1 How the payment-service fits the system

```
                 ┌─────────────────────────── payment-service (port 3005) ───────────────────────────┐
 customer-web ──HTTP──▶  PaymentsController / WalletController / PaymentMethodsController              │
                 │                                                                                     │
 order-service ──RabbitMQ──▶  SagaPaymentConsumer  ── charges via ──▶  StripeService ──▶  Stripe API   │
   (the saga)   ◀─RabbitMQ──  (replies on saga.replies)                                                │
                 │                                                                                     │
 Stripe ────────Webhook (HTTP)──▶  StripeWebhookController  ── updates ──▶  Postgres (grab_payments)   │
                 │                                            └─ emits ──▶ events (Kafka/EventEmitter)  │
                 │                  Redis (idempotency keys, distributed locks)                        │
                 └─────────────────────────────────────────────────────────────────────────────────────┘
```

Two entry points matter:

1. **HTTP API** — the customer manages cards, tops up their wallet, downloads invoices.
2. **The order saga** — when a customer checks out (Phase 3), the order-service saga sends a `process-payment` command over RabbitMQ. **Phase 4 is what makes that command actually charge money.** Today the saga's payment step is effectively a stub waiting for a reply that never comes from a real service.

### 0.2 What already exists (don't rebuild these)

| Thing                              | Where                                                        | Note                                                                                          |
| ---------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `grab_payments` Postgres DB        | created by `infrastructure/docker/init/postgres/01-init.sql` | already exists when infra is up                                                               |
| Stripe env vars                    | `.env` → `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`        | placeholders — you'll put real **test** keys in                                               |
| `PAYMENT_SERVICE_DB=grab_payments` | `.env`                                                       | already set                                                                                   |
| Payment **types**                  | `packages/types/src/payment.types.ts`                        | `Payment`, `Wallet`, `Refund`, `Payout`, `Invoice`, enums — **reuse these**                   |
| Payment **Zod schemas**            | `packages/validators/src/payment.schemas.ts`                 | `processPaymentSchema`, `topUpWalletSchema`, etc. — **reuse these**                           |
| Shared Nest building blocks        | `@grab/nestjs-common`                                        | `JwtAuthGuard`, `RolesGuard`, `HttpExceptionFilter`, `TransformInterceptor`, `@CurrentUser()` |
| The current (bare) service         | `services/payment-service/src/`                              | only the 5-file NestJS boilerplate — you'll flesh it out                                      |

### 0.3 The saga payment contract (memorise this — it's the trickiest integration)

The order-service saga **publishes** a command and **waits** for a reply. You must match this exactly.

**Command it sends** → queue `saga.commands.process-payment`:

```ts
// built by ProcessPaymentStep.buildCommand in order-service
{
  sagaId: string,
  stepName: 'process-payment',
  orderId: string,
  customerId: string,
  amount: number,        // VND, integer (e.g. 220000)
  currency: 'VND',
  idempotencyKey: string // = `order:${orderId}`
}
```

**Reply you must send** → queue `saga.replies`:

```ts
// SagaReply (see services/order-service/src/sagas/interfaces/saga.interfaces.ts)
{
  sagaId: string,
  stepName: 'process-payment',   // MUST match — orchestrator drops mismatched replies
  success: boolean,
  data?: { paymentIntentId: string },  // merged into saga context, used for refunds
  error?: string                        // set when success === false
}
```

**Compensation** → if a _later_ saga step fails, the orchestrator publishes to `saga.commands.refund-payment`:

```ts
{ sagaId, stepName: 'process-payment', orderId, paymentIntentId, amount, reason }
```

Compensation is **fire-and-forget** — no reply expected. You just refund.

> Queue rules (copy from `services/order-service/src/sagas/rabbitmq.service.ts`): all queues are `durable: true`, messages are `persistent`, and each queue dead-letters to `saga.dlq`. The saga uses **plain `amqplib`**, _not_ Nest's microservice `ClientProxy` — mirror that.

### 0.4 Gotchas that will bite you (learned from earlier phases)

1. **`tsconfig.json` `rootDir` must be `"../../"`, not `"./src"`.** Because the service imports `@grab/types` (a path-mapped source file _outside_ `src/`), a `rootDir: "./src"` makes `nest build` fail with **TS6059**. Copy `services/restaurant-service/tsconfig.json` exactly, and set `"start": "node dist/services/payment-service/src/main"` in `package.json` (the build output nests under `dist/services/...`). This already broke order-service once.
2. **Stripe webhooks need the _raw_ request body.** Signature verification fails if Nest parses the JSON first. You must enable `rawBody` and use it only on the webhook route. See Task 6.
3. **VND is a zero-decimal currency in Stripe.** Send `amount` as the plain integer (220000 = 220,000 VND). Do **not** multiply by 100. (For USD you would ×100.)
4. **Money is stored as integers** everywhere (VND). Never use floats for money.
5. **Tests don't catch build errors.** `ts-jest` transpiles without full type-checking and eslint doesn't type-check. Always run `pnpm --filter @grab/payment-service build` before committing.

### 0.5 One-time setup before Task 1

- Start infra: `docker compose -f infrastructure/docker/docker-compose.infra.yml up -d postgres redis rabbitmq`
- Create a **free Stripe test account** → Dashboard → Developers → API keys. Put the **test** secret key in `.env`:
  ```
  STRIPE_SECRET_KEY=sk_test_...your key...
  ```
  (Leave `STRIPE_WEBHOOK_SECRET` for Task 6 — you get it from the Stripe CLI.)
- Install the **Stripe CLI** (for local webhook testing in Task 6): https://stripe.com/docs/stripe-cli

### 0.6 Conventions you must follow every commit

- **Commit message style** (matches this repo): emoji + conventional commit, e.g.
  `✨ feat(payment-service): add Redis-backed idempotency service`
  Use `🧪 test(...)` for test-only, `🐳 chore(...)` for config/tooling, `🐞 fix(...)` for fixes.
- **Before every commit run:**
  ```
  pnpm --filter @grab/payment-service lint
  pnpm --filter @grab/payment-service build
  pnpm --filter @grab/payment-service test
  ```
  (Husky + lint-staged also run on commit. If a hook fails, fix the cause — don't bypass it.)
- **Tests live next to the code** as `*.spec.ts`. Copy the mocking style from the tests already in `services/order-service/src/orders/orders.service.spec.ts` and `services/restaurant-service/src/restaurants/restaurants.service.spec.ts`.
- **No floats for money. No `any` if you can avoid it. `public`/`private` on every class member** (the linter enforces accessibility modifiers).

---

## Task list at a glance

| #   | Commit                                                 | Depends on        |
| --- | ------------------------------------------------------ | ----------------- |
| 1   | Scaffold service (config, health, bootstrap)           | —                 |
| 2   | Entities + migration (7 tables)                        | 1                 |
| 3   | Redis idempotency service                              | 1                 |
| 4   | Stripe SDK wrapper (`StripeService`)                   | 1                 |
| 5   | Create-payment flow (HTTP) + state machine             | 2,3,4             |
| 6   | Stripe webhook handler                                 | 5                 |
| 7   | Thread payment method through checkout (order-service) | — (order-service) |
| 8   | Saga consumer: process-payment + refund-payment        | 5,7               |
| 9   | Saved payment methods (SetupIntent)                    | 4                 |
| 10  | In-app wallet (balance/top-up/debit)                   | 2,3               |
| 11  | Refunds (full + partial)                               | 5                 |
| 12  | Split payment + payout records                         | 5                 |
| 13  | Invoices (PDF) + transaction history                   | 2                 |
| 14  | _(stretch)_ Fraud heuristics                           | 5                 |
| 15  | _(stretch)_ Monthly payout batch job                   | 12                |
| 16  | FE: payment API client + Stripe.js provider            | 5                 |
| 17  | FE: manage payment methods (Stripe Elements)           | 9,16              |
| 18  | FE: wallet page                                        | 10,16             |
| 19  | FE: checkout payment selection                         | 7,16              |
| 20  | FE: invoice download                                   | 13,16             |

> Tasks 14 and 15 are **stretch** — ship the core flow first. The "must-have for a working order" path is **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**.

---

## TASK 1 — Scaffold the payment-service

**Goal:** A NestJS service that boots on HTTP `:3005` / TCP `:5005`, connects config, and answers `GET /health`.

**Concepts:** A NestJS _module_ groups providers/controllers. `ConfigModule` loads `.env`. `@nestjs/terminus` gives health checks. Every service in this repo follows the same skeleton — you're copying `restaurant-service`'s shape.

**Files to create / edit** (under `services/payment-service/`):

- `package.json` — copy `restaurant-service/package.json`, rename to `@grab/payment-service`, set `"start": "node dist/services/payment-service/src/main"`. Add deps: `stripe`, keep `@nestjs/*`, `typeorm`, `pg`, `ioredis`, `@nestjs/typeorm`, `@nestjs/config`, `@nestjs/terminus`, `@nestjs/swagger`. (You'll add `amqplib`, `@nestjs/bull`/`bull`, `pdfkit` in later tasks — only add what each task needs.)
- `tsconfig.json`, `tsconfig.build.json`, `tsconfig.spec.json`, `nest-cli.json`, `eslint.config.js` — copy from `restaurant-service`. **Set `rootDir: "../../"`** (see Gotcha #1).
- `src/main.ts` — copy `restaurant-service/src/main.ts`; change ports to HTTP `3005` / TCP `5005`, Swagger title to "Grab payment-service".
- `src/app.module.ts` — start minimal: `ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'], load: [stripeConfig, redisConfig, rabbitmqConfig, databaseConfig] })`, `TerminusModule`, `EventEmitterModule.forRoot(...)`. Keep the global `HttpExceptionFilter` + `TransformInterceptor` from `@grab/nestjs-common`. **Do not** add `JwtAuthGuard` globally yet — add it when you add protected routes (Task 5), or add it now and mark webhook routes `@Public()`.
- `src/config/stripe.config.ts`, `redis.config.ts`, `rabbitmq.config.ts`, `database.config.ts` — each is a `registerAs('stripe'|'redis'|'rabbitmq'|'database', () => ({...}))`. Copy `restaurant-service/src/config/*` and add:
  ```ts
  export const stripeConfig = registerAs('stripe', () => ({
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  }))
  ```
  For `database.config.ts`, use `process.env.PAYMENT_SERVICE_DB ?? 'grab_payments'`.
- `src/app.controller.ts` — a `/health` route using Terminus (copy restaurant-service's).

**Verify:**

```
pnpm --filter @grab/payment-service build         # must pass (tests the rootDir fix)
pnpm --filter @grab/payment-service dev           # then in another terminal:
curl http://localhost:3005/health                 # → { status: "ok" ... }
```

**Definition of done:** builds, lints, boots, `/health` returns ok.
**Commit:** `✨ feat(payment-service): scaffold service with config and health check`

---

## TASK 2 — Database entities + initial migration

**Goal:** Seven Postgres tables created automatically on boot via a TypeORM migration.

**Concepts:** _Entities_ are TypeScript classes mapped to tables. We **never** use `synchronize: true` in this repo — schema changes go through **migrations** (`migrationsRun: true` runs them on startup). Mirror the field shapes already defined in `packages/types/src/payment.types.ts`.

**Tables** (one entity each): `payments`, `payment_methods`, `wallets`, `wallet_transactions`, `refunds`, `payouts`, `invoices`. Match `payment.types.ts`. Money columns are `bigint`/`int` (VND integers) — use a TypeORM transformer to keep them as `number` in JS, or store as `int`. Status columns are `varchar`.

**Files:**

- `src/payments/entities/payment.entity.ts`, `payment-method.entity.ts`, `refund.entity.ts`, …, `src/wallet/entities/wallet.entity.ts`, `wallet-transaction.entity.ts`, `src/invoices/entities/invoice.entity.ts`, `src/payouts/entities/payout.entity.ts`. (Group by the feature folder they belong to.)
- `src/database/database.module.ts` — copy `restaurant-service/src/database/database.module.ts`, list all 7 entities, keep `synchronize: false, migrationsRun: true, migrations: [__dirname + '/migrations/*.{ts,js}']`.
- `src/database/data-source.ts` — copy user-service's (used by the `db:migrate` CLI).
- `src/database/migrations/<timestamp>-InitialSchema.ts` — write the `up()` (CREATE TABLE …) and `down()` (DROP TABLE …). You can hand-write it, or scaffold by temporarily setting `synchronize: true`, booting, dumping the SQL, then writing the migration and turning synchronize back off. **Add useful indexes:** `payments(order_id)`, `payments(idempotency_key)` unique, `wallet_transactions(wallet_id)`, `payouts(recipient_id, period_start)`.

**Verify:** boot the service; check tables exist:

```
docker exec -it grab-postgres psql -U grab_user -d grab_payments -c "\dt"
```

**Definition of done:** all 7 tables + indexes created on boot; build/lint pass.
**Commit:** `✨ feat(payment-service): add TypeORM entities and initial migration`

---

## TASK 3 — Redis-backed idempotency service

**Goal:** A service that prevents charging the same request twice.

**Concepts:** An _idempotency key_ is a client-supplied unique string. The first request with a key does the work and **stores the result** under that key; any retry with the same key returns the stored result instead of charging again. This protects against network retries and the saga re-sending a command. Store in Redis with a TTL (e.g. 24h).

**Files:**

- `src/redis/redis.module.ts` + provider — an `ioredis` client (`REDIS_CLIENT` token). Copy the pattern from `services/order-service/src/cart` (it injects a Redis client) or user-service.
- `src/idempotency/idempotency.service.ts`:
  ```ts
  // check(key): returns the stored response or null
  // remember(key, response, ttlSeconds): stores it
  // Use SET key value NX EX ttl semantics; serialize response as JSON.
  ```
- `src/idempotency/idempotency.service.spec.ts` — mock the Redis client (see `cart.service.spec.ts` for the in-memory `Map` mock pattern). Test: first call stores + returns null on lookup-miss; second call returns the cached value.

**Verify:** `pnpm --filter @grab/payment-service test`

**Definition of done:** unit tests pass.
**Commit:** `✨ feat(payment-service): add Redis-backed idempotency service`

---

## TASK 4 — Stripe SDK wrapper (`StripeService`)

**Goal:** One injectable service that wraps the `stripe` SDK so the rest of the code never touches `new Stripe(...)` directly.

**Concepts:** Wrapping a third-party SDK in a service makes it **mockable in tests** and centralises config. A _PaymentIntent_ represents an attempt to collect money. A _SetupIntent_ saves a card without charging. _Refunds_ and _Transfers_ (Stripe Connect, for payouts) come later.

**Files:**

- `src/stripe/stripe.module.ts`, `src/stripe/stripe.service.ts`:
  ```ts
  @Injectable()
  export class StripeService {
    private readonly stripe: Stripe
    constructor(config: ConfigService) {
      this.stripe = new Stripe(config.getOrThrow('stripe.secretKey'))
    }
    public createPaymentIntent(params): Promise<Stripe.PaymentIntent> { ... }
    public createSetupIntent(customerId): Promise<Stripe.SetupIntent> { ... }
    public refund(paymentIntentId, amount?): Promise<Stripe.Refund> { ... }
    public constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event { ... } // verifies signature
  }
  ```
- Remember **VND is zero-decimal** (Gotcha #3): pass `amount` as-is, `currency: 'vnd'`.

**Verify:** build + a tiny unit test that mocks the SDK (you can inject a fake `Stripe` or assert your wrapper calls the right SDK method).

**Definition of done:** builds, `StripeService` injectable.
**Commit:** `✨ feat(payment-service): integrate Stripe SDK behind StripeService`

---

## TASK 5 — Create-payment flow (HTTP) + state machine

**Goal:** `POST /payments` creates a payment, drives the state machine `PENDING → PROCESSING → (SUCCEEDED|FAILED)`, is idempotent, and emits events.

**Concepts:** A _state machine_ means a payment can only move along allowed transitions. For card payments, you create a Stripe PaymentIntent (status starts `PROCESSING`); the final `SUCCEEDED`/`FAILED` comes later from the **webhook** (Task 6) — not synchronously. Validate the body with `processPaymentSchema` (already in `@grab/validators`).

**Files:**

- `src/payments/payments.service.ts` — `createPayment(userId, dto)`:
  1. `idempotency.check(dto.idempotencyKey)` → return cached if present.
  2. Insert a `payments` row (`PENDING`).
  3. Branch on `dto.method`: `card` → `StripeService.createPaymentIntent` and move to `PROCESSING`; `wallet` → debit wallet (Task 10) and `SUCCEEDED`; `cash_on_delivery` → `PENDING` (settled on delivery).
  4. `idempotency.remember(...)`, emit `payment.processing`.
- `src/payments/payments.controller.ts` — `POST /payments` (guarded by `JwtAuthGuard`, `@CurrentUser()`), `GET /payments/:id`.
- DTO using the Zod schema (a small `ZodValidationPipe`, or class-validator DTO mirroring `processPaymentSchema`).
- `payments.service.spec.ts` — mock `StripeService`, the repo, and `IdempotencyService`. Test: idempotent replay returns cached; card path creates intent + sets PROCESSING; invalid transition throws.

**Verify:** unit tests + manual `curl -X POST /payments` with a Bearer token.

**Definition of done:** create flow works, idempotent, tested.
**Commit:** `✨ feat(payment-service): create payment flow with idempotency and state machine`

---

## TASK 6 — Stripe webhook handler

**Goal:** Stripe tells you when a PaymentIntent actually succeeds/fails; you update the payment and emit `payment.succeeded` / `payment.failed`.

**Concepts:** Payments confirm **asynchronously**. Stripe POSTs an event to your webhook URL. You must **verify the signature** using the raw request body and `STRIPE_WEBHOOK_SECRET`, then react to `payment_intent.succeeded` / `payment_intent.payment_failed`.

**Gotcha #2 — raw body.** In `main.ts`, create the app with `{ rawBody: true }` (or add `bodyParser` raw for the webhook path). The webhook controller reads `req.rawBody` and passes it to `StripeService.constructWebhookEvent`. The webhook route must be **`@Public()`** (no JWT) and **excluded from the global `TransformInterceptor`** if that wraps responses.

**Files:**

- `src/stripe/stripe-webhook.controller.ts` — `POST /payments/webhook`, read raw body + `stripe-signature` header, verify, switch on event type, update payment status, emit events.
- Update `main.ts` for `rawBody`.
- Get the local webhook secret:
  ```
  stripe listen --forward-to localhost:3005/payments/webhook
  # copy the printed whsec_... into STRIPE_WEBHOOK_SECRET in .env
  ```

**Verify:** with `stripe listen` running, trigger a test event:

```
stripe trigger payment_intent.succeeded
```

The payment row should flip to `SUCCEEDED` and a `payment.succeeded` event should fire.

**Definition of done:** signed webhook updates payment status; bad signature is rejected (test this).
**Commit:** `✨ feat(payment-service): verify and handle Stripe webhooks`

---

## TASK 7 — Thread the payment method through checkout (order-service change)

**Goal:** Make the order know _how_ it will be paid, so the saga can tell payment-service.

**Why:** Right now `ProcessPaymentCommand` (built in order-service) only carries `amount`/`currency`/`idempotencyKey` — **not** the chosen method. Without this, payment-service can't know whether to charge a card, debit the wallet, or skip (COD).

**Files (in `services/order-service`):**

- `src/orders/dto/create-order.dto.ts` — add `paymentMethod: 'card' | 'wallet' | 'cash_on_delivery'` and optional `paymentMethodId`.
- The `OrderCreated` event + `SagaContext` (`src/sagas/interfaces/saga.interfaces.ts`) — carry `paymentMethod` / `paymentMethodId` through.
- `src/sagas/steps/process-payment.step.ts` — include `method` and `paymentMethodId` in the command it builds.
- Update the affected order-service unit tests (`orders.service.spec.ts`, `saga-orchestrator.service.spec.ts`).

**Verify:** `pnpm --filter @grab/order-service build && pnpm --filter @grab/order-service test`

**Definition of done:** the saga's process-payment command now includes the method; order tests still pass.
**Commit:** `✨ feat(order-service): carry payment method through checkout into the saga`

---

## TASK 8 — Saga consumer: process-payment + refund-payment over RabbitMQ

**Goal:** **This is the keystone of the phase.** payment-service consumes the saga's payment command, charges, and replies — making the end-to-end order flow real.

**Concepts:** You'll mirror `services/order-service/src/sagas/rabbitmq.service.ts` (plain `amqplib`, durable queues, DLQ). Re-read §0.3 for the exact command/reply shapes.

**Files:**

- Add `amqplib` to `package.json`.
- `src/saga/rabbitmq.service.ts` — copy order-service's: connect, `prefetch(1)`, assert the two queues you consume (`saga.commands.process-payment`, `saga.commands.refund-payment`) **and** `saga.replies` (for publishing) + `saga.dlq`, with the same dead-letter args.
- `src/saga/saga-payment.consumer.ts` (`OnModuleInit`):
  - Consume `saga.commands.process-payment`:
    1. Reuse the command's `idempotencyKey` (`order:{orderId}`) so a re-delivered command doesn't double-charge.
    2. Branch on `method`: `cash_on_delivery` → record `PENDING`, reply `success: true, data: { paymentIntentId: '' }`. `wallet` → debit wallet; success/fail accordingly. `card` → create + **confirm off-session** a PaymentIntent with the saved `paymentMethodId`; on success reply with `data: { paymentIntentId }`; on failure reply `success: false, error`.
    3. **Publish the reply to `saga.replies`** with `stepName: 'process-payment'`.
  - Consume `saga.commands.refund-payment` (compensation, no reply): call your refund logic (Task 11) for the given `paymentIntentId`/`amount`.
- **Integration test** (`test/saga-payment.e2e-spec.ts`, needs RabbitMQ): publish a fake process-payment command, assert a reply lands on `saga.replies` with the right shape. Use the same Docker-infra pattern as `services/order-service/test/order-flow.e2e-spec.ts`, and add a `test:e2e` script + `test/jest-e2e.json` + `test/tsconfig.json` (copy order-service's).

**Verify (the real prize):** with infra + order-service + payment-service running, place an order from the customer web app (or POST the order checkout). Watch the saga advance past `process-payment` to `confirm-order` and the order reach `CONFIRMED`. A failed payment should trigger compensation (order `CANCELLED`).

**Definition of done:** saga payment step completes against payment-service; reply contract matches; integration test passes.
**Commit:** `✨ feat(payment-service): process saga payment & refund commands over RabbitMQ`

---

## TASK 9 — Saved payment methods (Stripe SetupIntent)

**Goal:** Customer can save a card, list cards, set default, remove.

**Concepts:** A _SetupIntent_ collects + saves a card for future off-session charges, without charging now. Stripe stores the card; you store only safe metadata (`brand`, `last4`, `expMonth/Year`, `stripePaymentMethodId`) — **never raw card numbers**.

**Files:** `src/payment-methods/payment-methods.{service,controller}.ts` + entity (from Task 2). Endpoints: `POST /payment-methods/setup-intent` (returns client secret), `POST /payment-methods` (save after confirm, uses `addPaymentMethodSchema`), `GET /payment-methods`, `PATCH /payment-methods/:id/default`, `DELETE /payment-methods/:id`. Unit-test the default-toggle logic (only one default per user — mirror the address default logic in `user-service`).

**Definition of done:** CRUD works; only one default; tested.
**Commit:** `✨ feat(payment-service): manage saved cards via Stripe SetupIntent`

---

## TASK 10 — In-app wallet

**Goal:** Balance, top-up, debit, transaction history — with **safe concurrent updates**.

**Concepts:** Wallet balance is money — concurrent debits must not race. Update the balance inside a **DB transaction** and either use a row lock (`SELECT ... FOR UPDATE`) or an optimistic `version` column. Always write a `wallet_transactions` row recording `balanceBefore`/`balanceAfter` (an audit trail). Validate top-up with `topUpWalletSchema`.

**Files:** `src/wallet/wallet.{service,controller}.ts`. Methods: `getOrCreateWallet(userId)`, `credit(userId, amount, ref)`, `debit(userId, amount, ref)` (throws on insufficient funds), `getTransactions(userId, query)`. Endpoints: `GET /wallet`, `POST /wallet/top-up` (creates a card payment via Task 5, credits on success), `GET /wallet/transactions`. The saga `wallet` payment path (Task 8) calls `debit`. Unit-test: debit beyond balance throws; credit/debit update transactions; balance math is integer-exact.

**Definition of done:** atomic balance updates, audit rows, tested.
**Commit:** `✨ feat(payment-service): in-app wallet with top-up and transactions`

---

## TASK 11 — Refunds (full + partial)

**Goal:** Refund a payment fully or partially; reflect it in payment status.

**Concepts:** A refund returns money via Stripe (`StripeService.refund`). Full refund → payment `REFUNDED`; partial → `PARTIALLY_REFUNDED`. Wallet-funded payments refund by **crediting the wallet** instead of calling Stripe. Validate with `requestRefundSchema`.

**Files:** `src/refunds/refunds.{service,controller}.ts` + entity. `POST /refunds`. The saga compensation consumer (Task 8) calls `RefundsService` too. Unit-test: full vs partial status; wallet refund credits wallet; can't refund more than captured.

**Definition of done:** both refund paths work; status correct; tested.
**Commit:** `✨ feat(payment-service): full and partial refunds`

---

## TASK 12 — Split payment + payout records

**Goal:** On a successful payment, compute the money split and record payout rows.

**Concepts:** The order total splits into **platform fee + restaurant share + driver commission**. On `payment.succeeded`, insert `payouts` rows (status `PENDING`) for the restaurant and driver. (Actual transfer happens in the stretch Task 15.) Keep the split percentages in config.

**Files:** `src/payouts/payouts.service.ts` — `recordSplit(payment)`, listening to `payment.succeeded` via `@OnEvent`. Unit-test the split math sums back to the total (integer-exact — assign the rounding remainder to the platform).

**Definition of done:** payout rows created on success; split sums exactly; tested.
**Commit:** `✨ feat(payment-service): record payout splits on successful payment`

---

## TASK 13 — Invoices (PDF) + transaction history

**Goal:** Generate an invoice PDF per order and expose transaction history.

**Concepts:** Use `pdfkit` to render a PDF from invoice data (reuse the `Invoice`/`InvoiceItem` types). Store the PDF in MinIO (the repo already runs MinIO; see media-service for the client pattern) and save its key/URL on the `invoices` row.

**Files:** `src/invoices/invoices.{service,controller}.ts`. `GET /invoices/:orderId` (returns/streams the PDF or a link), `GET /payments` (paginated history for the user). Generate the invoice on `payment.succeeded`. Unit-test the data assembly (mock the PDF/MinIO calls).

**Definition of done:** invoice PDF generated + retrievable; history endpoint paginates.
**Commit:** `✨ feat(payment-service): generate invoices and expose transaction history`

---

## TASK 14 — _(stretch)_ Fraud detection heuristics

**Goal:** Block obviously-bad payments before charging.

**Concepts:** Simple heuristics — **velocity** (too many payments per user in a short window, tracked in Redis) and **amount anomaly** (way above the user's normal). Reject with a clear error; log for review.

**Files:** `src/fraud/fraud.service.ts`, called at the start of `createPayment`. Unit-test each heuristic with mocked Redis/history.
**Commit:** `✨ feat(payment-service): basic fraud detection heuristics`

---

## TASK 15 — _(stretch)_ Monthly payout batch job

**Goal:** On the 1st of each month, pay out accumulated earnings to restaurants/drivers via Stripe Connect transfers — **safely** (idempotent, resumable).

**Concepts (this one is meaty — read `scope.md` §Phase 4 for the full spec):** BullMQ + `@Cron`. Acquire a **Redis distributed lock** (`payout:batch:{period}`) so only one instance runs. **Chunk** orders in pages of 1000, persisting a **checkpoint** to Redis after each chunk so a restart resumes instead of re-scanning. Aggregate per recipient, skip those under the payout threshold, create a Stripe Connect transfer with idempotency key `payout:{recipientId}:{period}`, record results, retry failures with backoff (max 3), and generate a per-recipient PDF summary.

**Files:** `src/payouts/payout-batch.processor.ts` (BullMQ), `src/payouts/payout.cron.ts`. Add `@nestjs/bull` + `bull`. Unit-test the lock gate, checkpoint resume, and idempotency gate with mocks.
**Commit:** `✨ feat(payment-service): monthly payout batch job`

---

## Frontend tasks (customer-web)

> Stack already in use: Next.js App Router, TanStack Query, Zustand, Shadcn/ui. Add `@stripe/stripe-js` + `@stripe/react-stripe-js`. Put `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` in `.env`. Mirror the existing API-client/hooks pattern in `apps/customer-web/src` (look at the cart/orders clients added in Phase 3).

### TASK 16 — Payment API client + Stripe.js provider

Create `lib/api/payments.ts` (typed fetchers for the endpoints from Tasks 5/9/10/13) + TanStack Query hooks. Add a `<StripeProvider>` wrapping the app with `loadStripe(publishableKey)`.
**Commit:** `✨ feat(customer-web): payment API client and Stripe provider`

### TASK 17 — Manage payment methods (Stripe Elements)

`/account` section: add card with Stripe `<PaymentElement>`/`<CardElement>` (SetupIntent flow), list cards, set default, remove. Optimistic UI for default/remove.
**Commit:** `✨ feat(customer-web): manage saved payment methods`

### TASK 18 — Wallet page

`/account/wallet`: balance, top-up form (uses a saved card), transaction history (infinite scroll). Skeleton loading + error states.
**Commit:** `✨ feat(customer-web): wallet page with top-up and history`

### TASK 19 — Checkout payment selection

On `/checkout`: choose **card / wallet / COD**, pass the choice into the order create call (Task 7 added the field). Show processing → success/failure states; on success route to the order tracking page.
**Commit:** `✨ feat(customer-web): payment method selection at checkout`

### TASK 20 — Invoice download

On the order detail page, a "Download invoice" button hitting `GET /invoices/:orderId`.
**Commit:** `✨ feat(customer-web): download order invoice`

---

## Definition of done for Phase 4

- A customer can save a card, top up a wallet, and check out paying by **card / wallet / COD**.
- Placing an order drives the **saga** through a real charge (`process-payment` → reply → `confirm-order`); a failed charge triggers **compensation** (order cancelled, money refunded).
- Stripe **webhooks** finalise payment status; **refunds** work (full + partial).
- **Invoices** generate; **payout split** rows are recorded.
- Every service still passes `pnpm run lint`, `pnpm run build`, and `pnpm test`; new logic has unit tests, and the saga payment path has an integration test.

### How to demo the whole thing

1. `docker compose -f infrastructure/docker/docker-compose.infra.yml up -d`
2. `stripe listen --forward-to localhost:3005/payments/webhook` (paste the secret into `.env`)
3. Run order-service + payment-service + customer-web (`pnpm --filter ... dev`).
4. Add a test card (`4242 4242 4242 4242`, any future expiry/CVC), check out, and watch the order reach **CONFIRMED**.

---

### A note on the "vibe code" you're building on

You'll lean on three things you didn't write: the **saga orchestrator** (`order-service/src/sagas`), the **shared Nest building blocks** (`@grab/nestjs-common`), and the **types/validators** packages. You don't need to understand every line — you need the **contracts**: §0.3 (saga messages), the guards/interceptors you import, and the `payment.types.ts`/`payment.schemas.ts` shapes. When in doubt, open the matching file in `restaurant-service` or `user-service` and copy its shape — they're the cleanest references.

```

```
