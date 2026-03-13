# WebSocket Upload Status — Media Service

## Overview

Real-time upload progress via Socket.IO + Redis Pub/Sub. The image processor runs in a BullMQ worker (separate from the HTTP server), so direct WebSocket emission isn't possible — Redis Pub/Sub acts as the bridge.

```
Client ──── Socket.IO ────► UploadGateway
                                  │
                            Redis SUB (upload:*)
                                  ▲
                            Redis PUB (upload:{id})
                                  ▲
                          UploadProgressService
                                  ▲
                          ImageProcessor (BullMQ Worker)
```

---

## Files

| File                                       | Role                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `src/upload/upload-progress.service.ts`    | Redis publisher — called by the BullMQ worker at each processing step               |
| `src/upload/upload.gateway.ts`             | Socket.IO gateway (`/uploads` namespace) — bridges Redis Pub/Sub to WebSocket rooms |
| `src/upload/processors/image.processor.ts` | BullMQ worker — processes images and emits progress via `UploadProgressService`     |
| `src/upload/upload.controller.ts`          | HTTP controller — `POST /presigned` now returns `wsRoom` and `wsNamespace`          |

---

## Flow

### Step-by-step

```
1. Client → POST /uploads/presigned
           ← { uploadId, presignedUrl, expiresAt, wsRoom, wsNamespace }

2. Client → connect to Socket.IO at ws://<host>:3010/uploads
           → emit 'join' with uploadId
           (now subscribed to progress events for that upload)

3. Client → PUT presignedUrl  (upload file directly to MinIO — no server in the middle)

4. Client → POST /uploads/:id/confirm
           (triggers BullMQ job)

5. Worker → processes image, publishes to Redis channel upload:{uploadId} at each step
   Gateway → receives from Redis, emits 'progress' event to Socket.IO room upload:{uploadId}
   Client  → receives 'progress' events in real-time

6. Client → POST /uploads/:id/claim  (after step === 'done')
           ← { urls: { thumbnail, medium, full } }
           (row deleted from DB after claim)

7. Client → PATCH /restaurants/:id/cover-image { url: urls.medium }
           (save URL to the target entity)
```

### Fallback (polling)

If the WebSocket connection drops, the client can poll:

```
GET /uploads/:id
← { status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED', urls: { ... } }
```

---

## Progress Events

The `progress` event payload:

```ts
{
  uploadId: string
  step: 'download' | 'resize_thumbnail' | 'resize_medium' | 'resize_full' | 'save' | 'done' | 'failed'
  status: 'started' | 'done' | 'error'
  progress: number   // 0–100, or -1 on failure
  message?: string   // error message when step === 'failed'
}
```

### Progress timeline

| Step               | Status  | Progress |
| ------------------ | ------- | -------- |
| `download`         | started | 5%       |
| `download`         | done    | 10%      |
| `resize_thumbnail` | started | 20%      |
| `resize_thumbnail` | done    | 25%      |
| `resize_medium`    | started | 45%      |
| `resize_medium`    | done    | 50%      |
| `resize_full`      | started | 70%      |
| `resize_full`      | done    | 75%      |
| `save`             | started | 80%      |
| `save`             | done    | 90%      |
| `done`             | done    | 100%     |
| `failed`           | error   | -1       |

---

## Client Example (TypeScript)

```ts
import { io } from 'socket.io-client'

async function uploadImage(file: File, context: string, entityId: string) {
  // 1. Request presigned URL
  const { uploadId, presignedUrl, wsRoom, wsNamespace } = await fetch('/uploads/presigned', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, entityId }),
  }).then((r) => r.json())

  // 2. Connect and join the room
  const socket = io(`http://localhost:3010${wsNamespace}`)
  socket.emit('join', uploadId)

  socket.on('progress', (event) => {
    console.log(`[${event.progress}%] ${event.step} — ${event.status}`)

    if (event.step === 'done') {
      socket.disconnect()
    }
    if (event.step === 'failed') {
      console.error('Upload failed:', event.message)
      socket.disconnect()
    }
  })

  // 3. Upload directly to MinIO via presigned URL
  await fetch(presignedUrl, { method: 'PUT', body: file })

  // 4. Trigger image processing
  await fetch(`/uploads/${uploadId}/confirm`, { method: 'POST' })

  // 5. Wait for done event (handled above), then claim
  // ... after receiving done event:
  const { urls } = await fetch(`/uploads/${uploadId}/claim`, { method: 'POST' }).then((r) =>
    r.json(),
  )

  return urls // { thumbnail, medium, full }
}
```

---

## Architecture Notes

### Why Redis Pub/Sub?

The BullMQ image processor runs as a worker — it has no access to the Socket.IO server instance. Redis Pub/Sub decouples the worker from the gateway:

- Worker publishes to Redis channel `upload:{uploadId}`
- Gateway subscribes to `upload:*` pattern and forwards to Socket.IO rooms

### Why two separate Redis connections?

```
UploadProgressService  →  ioredis (publisher)   — issues PUBLISH commands
UploadGateway          →  ioredis (subscriber)  — blocked in PSUBSCRIBE mode
```

Redis does not allow a connection in subscribe mode to issue regular commands. They must be separate connections. Reusing the BullMQ Redis connection would break job queue operations.

### Redis instance used

Both the publisher and subscriber use the **cache Redis** (`REDIS_HOST`/`REDIS_PORT`, default `localhost:6379`) — not the queue Redis (`REDIS_QUEUE_HOST:6380`).

Pub/Sub messages are transient (fire-and-forget) — they don't need the `noeviction` policy required by BullMQ.

---

## Environment Variables

| Variable           | Default     | Description                     |
| ------------------ | ----------- | ------------------------------- |
| `REDIS_HOST`       | `localhost` | Redis host for pub/sub          |
| `REDIS_PORT`       | `6379`      | Redis port for pub/sub          |
| `REDIS_QUEUE_HOST` | `localhost` | Redis host for BullMQ job queue |
| `REDIS_QUEUE_PORT` | `6380`      | Redis port for BullMQ job queue |
