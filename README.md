# EmailJobScheduler — Production Backend

A robust, enterprise-grade Email Scheduler backend built with **TypeScript, Express, PostgreSQL, Redis, BullMQ, Nodemailer (Ethereal SMTP), Elasticsearch 8, and Slack Notifications**.

Built for the ReachInbox hiring assignment to handle high-throughput, persistent delayed email scheduling with rate limiting, concurrency management, full-text search, and real-time observability.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Prerequisites & Quickstart](#prerequisites--quickstart)
4. [Environment Configuration](#environment-configuration)
5. [Docker Services](#docker-services)
6. [API Reference](#api-reference)
7. [Core Architectural Features](#core-architectural-features)
   - [Persistent Scheduling & Deterministic Job IDs](#persistent-scheduling--deterministic-job-ids)
   - [Idempotent Dispatch & Duplicate Prevention](#idempotent-dispatch--duplicate-prevention)
   - [Configurable Concurrency & Minimum Send Delay](#configurable-concurrency--minimum-send-delay)
   - [Hourly Rate Limiting with BullMQ Rescheduling](#hourly-rate-limiting-with-bullmq-rescheduling)
   - [Slack Rate-Limit Notifications](#slack-rate-limit-notifications)
   - [Elasticsearch 8 Email Search & Reindexing](#elasticsearch-8-email-search--reindexing)
   - [Live BullMQ Dashboard](#live-bullmq-dashboard)
   - [Graceful Startup & Shutdown](#graceful-startup--shutdown)
8. [Testing & Verification](#testing--verification)
9. [Assumptions, Trade-offs & Limitations](#assumptions-trade-offs--limitations)

---

## Architecture Overview

```
                      ┌──────────────────────┐
                      │   Client / Postman   │
                      └──────────┬───────────┘
                                 │ HTTP (Express.js)
                                 ▼
                     ┌────────────────────────┐
                     │ Express REST API Server│
                     └────┬───────────────┬───┘
                          │               │
            PostgreSQL 17 │               │ Redis 7
      ┌───────────────────┴───┐       ┌───┴───────────────────┐
      │   Primary Database    │       │     BullMQ Queue      │
      │   (Campaigns, Emails, │       │  (Delayed Jobs, Rate  │
      │   Recipients, Users)  │       │  Counters, Sessions)  │
      └───────────────────────┘       └───┬───────────────────┘
                                          │
                                          │ Job Event
                                          ▼
                              ┌──────────────────────┐
                              │ BullMQ Email Worker  │
                              └──────────┬───────────┘
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
      ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
      │   Ethereal SMTP    │  │  Elasticsearch 8   │  │    Slack Webhook   │
      │  (Email Delivery)  │  │ (Full-Text Search) │  │   (Rate Alerts)    │
      └────────────────────┘  └────────────────────┘  └────────────────────┘
```

---

## Tech Stack

### Frontend
- **Framework & Language:** React 19 + TypeScript (Vite 8)
- **Styling:** Tailwind CSS v4 (matching the Figma UI specification)
- **Icons:** Lucide React
- **API Client:** Typed native fetch layer with credentials handling (`connect.sid` cookie proxying)

### Backend
- **Runtime & Language:** Node.js (v20+) with TypeScript (ES Modules)
- **Web Framework:** Express.js 5 with Session & Passport Google OAuth
- **Database:** PostgreSQL 17 (Relational source of truth, ACID transactions)
- **Job Queue & Cache:** BullMQ 6 backed by Redis 7 (persistent delayed queues, distributed Lua locks)
- **Email Delivery:** Nodemailer with Ethereal SMTP
- **Search Engine:** Elasticsearch 8.15.0 (Full-text typo-tolerant search across subjects, bodies, recipients)
- **Monitoring UI:** Bull Board (`@bull-board/express`) for real-time queue metrics
- **Alerts:** Slack OAuth v2 & Block Kit rate-limit notifications

---

## Prerequisites & Quickstart

### Prerequisites
- **Node.js** (v20 or higher) & **npm**
- **Docker Desktop** (for PostgreSQL, Redis, and Elasticsearch)
- **Windows** (PowerShell or CMD) / macOS / Linux

### 1. Clone & Install Dependencies
```powershell
git clone <your-repo-url>
cd EmailJobScheduler/backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
*(Populate your Google OAuth and Ethereal credentials in `.env`).*

### 3. Start Docker Containers
From the project root:
```powershell
docker compose up -d
```
This starts:
- **PostgreSQL 17** on port `5432`
- **Redis 7** on port `6379`
- **Elasticsearch 8.15.0** on port `9200`

### 4. Run Typecheck & Start the Backend Server
```powershell
cd backend
npm run typecheck
npm run dev
```

The server initializes all dependencies in orderly sequence:
```text
Initializing EmailJobScheduler backend services...
Connected to PostgreSQL successfully.
Connected to Redis successfully.
Email worker is running.
SMTP connection verified successfully.
Elasticsearch index 'emails' created successfully.
Server is running on port 3000
BullMQ dashboard available at http://localhost:3000/admin/queues
```

### 5. Start the Frontend Client
In a new terminal:
```powershell
cd frontend
npm install
npm run dev
```
The application will be accessible at `http://localhost:5173` with Vite automatically proxying `/api`, `/auth`, `/integrations`, and `/admin` requests to the backend server.

---

## Environment Configuration

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port for Express | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://emailscheduler_user:local_dev_password@localhost:5432/emailscheduler` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `SESSION_SECRET` | Secret key for signing session cookies | Required in production |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Required for Google Auth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Required for Google Auth |
| `GOOGLE_CALLBACK_URL` | Google OAuth redirect callback | `http://localhost:3000/auth/google/callback` |
| `SMTP_HOST` | SMTP server host | `smtp.ethereal.email` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | Ethereal SMTP username | Required for email delivery |
| `SMTP_PASS` | Ethereal SMTP password | Required for email delivery |
| `WORKER_CONCURRENCY` | Concurrent email processing jobs | `5` |
| `MIN_SEND_DELAY_MS` | Minimum delay between individual sends | `2000` (2 seconds) |
| `DEFAULT_HOURLY_LIMIT`| Default hourly limit per sender | `100` |
| `ELASTICSEARCH_NODE` | Elasticsearch endpoint | `http://localhost:9200` |
| `SLACK_CLIENT_ID` | Slack OAuth Client ID | Optional (for Slack alerts) |
| `SLACK_CLIENT_SECRET` | Slack OAuth Client Secret | Optional (for Slack alerts) |
| `SLACK_REDIRECT_URI` | Slack OAuth callback URL | `http://localhost:3000/integrations/slack/callback` |

---

## API Reference

### 1. Authentication
- `GET /auth/google` — Initiates Google OAuth login.
- `GET /auth/google/callback` — Google OAuth callback.
- `GET /auth/me` — Returns the authenticated user session.
- `POST /auth/logout` — Destroys session and logs out.

### 2. Recipients
- `POST /api/recipients` — Create a new saved recipient.
  ```json
  {
    "email": "alice@example.com",
    "name": "Alice Smith"
  }
  ```
- `GET /api/recipients` — List all recipients owned by the authenticated user.

### 3. Campaigns & Scheduling
- `POST /api/campaigns` — Create a campaign and schedule delayed emails.
  ```json
  {
    "subject": "Product Announcement",
    "body": "Check out our newest release!",
    "startAt": "2026-10-25T10:00:00.000Z",
    "delaySeconds": 5,
    "hourlyLimit": 50,
    "recipientIds": [1, 2]
  }
  ```
  *Response (`201 Created`):*
  ```json
  {
    "status": "success",
    "data": {
      "campaign": {
        "id": 11,
        "subject": "Product Announcement",
        "status": "scheduled",
        "start_at": "2026-10-25T10:00:00.000Z"
      }
    }
  }
  ```
- `GET /api/campaigns` — List all campaigns for the authenticated user.

### 4. Elasticsearch Email Search
- `GET /api/emails/search?q=Product&status=sent&from=0&size=20` — Multi-field fuzzy search across subject, body, recipient email, and recipient name with status filtering.
- `POST /api/emails/reindex` — Triggers a complete reindex of all emails from PostgreSQL into Elasticsearch.

### 5. Slack Integration
- `GET /api/slack/authorize` — Redirects authenticated user to connect Slack workspace.
- `GET /integrations/slack/callback` — Slack OAuth redirect handler; securely stores tokens per user.
- `GET /api/slack/status` — Returns `{ connected: true, teamName: "My Workspace", channelName: "#alerts" }`.
- `DELETE /api/slack/disconnect` — Disconnects the Slack workspace.

### 6. Live BullMQ Dashboard
- `GET /admin/queues` — Web UI displaying real-time delayed, active, completed, and failed jobs.

---

## Core Architectural Features

### Persistent Scheduling & Deterministic Job IDs
Jobs in BullMQ are created with deterministic IDs (`email-${email.id}`). This prevents duplicate queue entries if campaign scheduling is retried. Delayed jobs are persisted in Redis with atomic timestamps and survive complete application restarts.

### Idempotent Dispatch & Duplicate Prevention
To guarantee that an email is never delivered twice:
1. **Atomic Claiming:** The worker updates the status in PostgreSQL from `scheduled` &rarr; `sending` using `WHERE id = $1 AND status = 'scheduled'`. Only one worker thread can successfully claim a record.
2. **`emailSent` Protection:** If `emailTransporter.sendMail()` succeeds but a later database update encounters an error, the worker registers that SMTP accepted the message. It will **never** mark the email as `failed` or allow a retry to re-send a duplicate.

### Configurable Concurrency & Minimum Send Delay
- Concurrency is configured via `WORKER_CONCURRENCY=5`.
- A minimum send delay (`MIN_SEND_DELAY_MS=2000`) is enforced across all concurrent workers using an atomic **Redis Lua script**. The script reserves sequential send slots so that no two emails are dispatched within 2 seconds of each other, regardless of thread concurrency or server instances.

### Hourly Rate Limiting with BullMQ Rescheduling
- Senders are rate-limited via a shared Redis 1-hour sliding counter (`rate_limit:user:${userId}:hour:${window}`).
- When the limit is reached:
  1. The email is **not** dropped or failed.
  2. The next hourly window is calculated.
  3. PostgreSQL updates `scheduled_at` to the new window.
  4. BullMQ calls `job.moveToDelayed(nextWindowTimestamp, job.token)` and throws `DelayedError()`.
  5. The job is cleanly deferred without recording a failure.

### Slack Rate-Limit Notifications
When an hourly rate limit is exceeded:
- An asynchronous alert is dispatched to the user's connected Slack channel using Block Kit.
- Displays the affected Campaign ID, Subject, Hourly Limit, and exact Reschedule Time.
- If Slack is not connected, the worker logs an audit note and continues without interrupting delivery.

### Elasticsearch 8 Email Search & Reindexing
- **Source of Truth:** PostgreSQL remains the ACID source of truth.
- **Asynchronous Sync:** When campaigns are created or statuses change (`scheduled` &rarr; `sent` &rarr; `failed`), updates are indexed in Elasticsearch asynchronously.
- **Recovery:** A dedicated `reindexAllEmails()` service enables instant recovery or backfilling.

### Live BullMQ Dashboard
Mounted on `/admin/queues` using Bull Board, providing real-time visibility into delayed queues, job metadata, payload details, and execution logs.

### Graceful Startup & Shutdown
On `SIGINT` or `SIGTERM`:
1. HTTP server stops accepting new incoming connections.
2. BullMQ worker closes gracefully, allowing in-flight email dispatches to complete cleanly.
3. BullMQ queues are closed.
4. Redis connections and PostgreSQL connection pools are drained.
5. Elasticsearch client disconnects cleanly.

---

## Assumptions, Trade-offs & Limitations

1. **SMTP Delivery vs Database Atomicity:** Network boundaries mean that SMTP acceptance and database record updates cannot be a single two-phase distributed transaction. This implementation prioritizes avoiding duplicate email delivery over pessimistic failures.
2. **Elasticsearch Index Consistency:** Elasticsearch is updated asynchronously following PostgreSQL commits. If the search node is down during dispatch, PostgreSQL records are unaffected, and the reindex endpoint (`POST /api/emails/reindex`) can be used to synchronize indices.
3. **Ethereal Email:** Ethereal is used as a test SMTP relay that catches all outgoing messages and provides web preview URLs without delivering to real inbox recipients. For production, SMTP credentials can be replaced with Amazon SES, SendGrid, or Postmark via `.env`.
