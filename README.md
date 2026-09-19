# ParcelRelay — Backend

Backend-only REST API for a courier & logistics platform covering the full
shipment lifecycle: **Booking → Pricing → Payment → Pickup → Courier Assignment
→ Origin Hub → Hub Transfer → Destination Hub → Delivery → Failed Delivery →
Retry / Return-to-Sender.**

> **Status:** Phase 1 — Project Foundation. Business modules (auth, shipment,
> payment, etc.) are implemented incrementally in later phases.

## Tech stack

- Node.js + TypeScript + Express
- PostgreSQL + Prisma ORM
- Zod (validation)
- Helmet, CORS, express-rate-limit (security)
- Biome (lint + format)

## Architecture

Modular monolith:

```
src/
├── app/
│   ├── config/        # env loading + validation
│   ├── interfaces/    # shared TypeScript types
│   ├── lib/           # infrastructure clients (Prisma, ...)
│   ├── middleware/    # error handling, rate limiting, 404
│   ├── module/        # feature modules (health, ... more later)
│   ├── routes/        # /api/v1 router registry
│   ├── templates/     # email/notification templates (later)
│   └── utils/         # response + error helpers
├── app.ts             # Express app configuration
└── server.ts          # server bootstrap + graceful shutdown
```

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env      # then edit values

# 3. Generate the Prisma client
npm run prisma:generate

# 4. Run in development
npm run dev
```

## Scripts

| Script                   | Description                          |
| ------------------------ | ------------------------------------ |
| `npm run dev`            | Start dev server (tsx watch)         |
| `npm run build`          | Compile TypeScript to `dist/`        |
| `npm start`              | Run compiled server                  |
| `npm run typecheck`      | Type-check without emitting          |
| `npm run lint`           | Biome lint + format check            |
| `npm run lint:fix`       | Biome auto-fix                       |
| `npm run format`         | Biome format write                   |
| `npm run prisma:generate`| Generate Prisma client               |

## API responses

Success:

```json
{ "success": true, "message": "Operation successful", "data": {} }
```

Error:

```json
{ "success": false, "message": "Something went wrong", "errors": [] }
```

## Health check

```
GET /api/v1/health
```

```json
{
  "success": true,
  "message": "ParcelRelay API is healthy",
  "data": { "status": "ok" }
}
```
