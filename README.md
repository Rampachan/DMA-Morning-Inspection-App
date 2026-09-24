# Mobile Compliance Reporting System (MCRS)

> Replacing the WhatsApp-based morning inspection reporting workflow for the **Directorate of Municipal Administration**, covering **170 Urban Local Bodies** (24 Corporations + 146 Municipalities) across Tamil Nadu.

---

## Architecture

```
mobile-compliance-system/
├── docker-compose.yml        # Local dev: PostGIS + MinIO + Backend
├── .env.example              # All required env vars with placeholder values
├── backend/                  # NestJS API (TypeScript)
├── mobile/                   # React Native app (Android, Commissioner)
└── dashboard/                # React + Vite dashboard (Admin / Director)
```

| Component | Technology | Hosting |
|-----------|-----------|---------|
| Backend API | NestJS + TypeORM | VM / Gov cloud |
| Database | PostgreSQL 15 + PostGIS | VM (Dockerized) |
| File Storage | MinIO (S3-compatible) | VM (Dockerized) |
| Mobile App | React Native (Android) | APK distribution |
| Dashboard | React + Vite + Tailwind | Vercel |

---

## Quick Start (Local Development)

### Prerequisites
- Docker Desktop
- Node.js 20+
- Java 17+ (for Android builds)
- Android Studio + SDK

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd mobile-compliance-system
cp .env.example backend/.env
# Edit backend/.env with your local values
```

### 2. Start infrastructure

```bash
docker-compose up -d postgres minio
```

MinIO console: http://localhost:9001 (login: minioadmin / minioadmin123)

### 3. Run database migrations + seed

```bash
cd backend
npm install
npm run typeorm migration:run
npx ts-node src/database/seeds/ulb.seed.ts
```

### 4. Start the backend

```bash
npm run start:dev
```

API: http://localhost:3000/api/v1  
Swagger: http://localhost:3000/api/docs (development only)

### 5. Start the dashboard

```bash
cd ../dashboard
npm install
npm run dev
```

Dashboard: http://localhost:5173

### 6. Run the mobile app

```bash
cd ../mobile
npm install
npx react-native run-android
```

---

## Running Tests

```bash
# Backend
cd backend && npm run test && npm run test:e2e

# Dashboard
cd dashboard && npm run test

# Mobile
cd mobile && npm test
```

---

## Environment Variables

See [`.env.example`](./.env.example) for all required variables. **Never commit `.env` files.**

Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string for signing JWTs |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | MinIO credentials |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging key |
| `SMS_PROVIDER_API_KEY` | SMS gateway key (set after vendor confirmed) |

---

## Key Business Rules

| Rule | Implementation |
|------|---------------|
| Submission window | 05:00–07:30 AM daily |
| Status determination | Server clock only — never client clock |
| Geo-fencing | PostGIS ST_DWithin with 200m tolerance; skipped if ULB has no boundary polygon |
| Photo limit | 1–10 per submission |
| Photo compression | sharp: max 1600px longest edge, JPEG quality 78 |
| Signed URLs | MinIO presigned GET, 1-hour expiry |
| Absent marking | 07:35 cron inserts `absent` rows + sends escalation SMS/push |
| Reminder | 06:45 cron sends SMS + push to non-yet-submitted commissioners |
| Reports | Auto-generated at 07:30, cached in MinIO, downloadable by Admin/Director |

---

## API Overview

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/login` | Public | Authenticate |
| POST | `/api/v1/users` | Admin | Create user account |
| GET | `/api/v1/submissions?date=` | Admin/Director | Daily submission list |
| POST | `/api/v1/submissions` | Commissioner | Submit inspection |
| GET | `/api/v1/reports/daily?date=` | Admin/Director | Download daily Excel |
| GET | `/api/v1/reports/monthly?month=` | Admin/Director | Download monthly Excel |

---

## Known Open Items

1. **ULB boundary polygons**: GIS shapefiles from the Directorate's GIS cell are needed to activate geo-fencing for all 170 ULBs. Current ULB seed data uses placeholder names — replace with official data before go-live.

2. **SMS gateway**: `StubSmsProvider` is the default. Swap with a concrete vendor adapter (implement `ISmsProvider`) once the state's empanelled provider is confirmed.

3. **Hosting approval**: Backend/DB/MinIO must be deployed to an approved government cloud (NIC or state cloud). Confirm before production deployment.

4. **FCM server key**: Obtain from Firebase Console for the production app.

---

## Security Notes

- All passwords: bcrypt, cost factor 12
- JWTs: 8-hour expiry, `Bearer` scheme
- Photos: private MinIO bucket, signed URLs only (1-hour expiry)
- Rate limits: 10 logins/min, 30 submissions/min per IP
- All state changes logged to immutable `audit_log` table
- Input validation: class-validator DTOs with `whitelist: true, forbidNonWhitelisted: true`
- Secrets: `.env` only, never committed

---

## Deployment

See the [Deployment Guide](./docs/deployment.md) for VM setup, Docker production compose, and Vercel dashboard deployment instructions.
