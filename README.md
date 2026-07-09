# Sentinel — Security Monitor

**Nuclei-powered vulnerability monitoring dashboard** with a scan queue, scheduled scans, multi-channel notifications, and real-time reporting.

### Features
- **Scan queue** with a configurable concurrency limit — scans wait as `queued` and start as slots free up
- **Stop / cancel** running or queued scans (kills the nuclei process)
- **Delete monitors** (cascades to their scans & findings)
- **Detailed reports** — description, remediation, references, CVSS, tags, CVE and cURL per finding
- **Live terminal streaming** of scan output via Server-Sent Events
- **Real template catalog** from the installed nuclei-templates (search + one-click update)
- **Password auth** (optional, single shared password via `AUTH_PASSWORD`)
- **SQLite** storage (WAL) — no more JSON-file race conditions

> ⚠️ Sentinel runs the `nuclei` CLI and needs a long-running server + a writable disk.
> It will **not** work on serverless platforms (Vercel/Netlify functions). Deploy with
> Docker on a VPS, Railway, Render, Fly.io, etc.

---

## Quick Start

### Option 1: Docker (Recommended)

```bash
cd sentinel

# Build & run (SQLite — default, zero config)
docker-compose up -d --build

# Open http://localhost:3001
```

### Option 2: Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start backend API
npm run api

# 3. Start frontend (new terminal)
npm run dev

# 4. Open http://localhost:3000
```

### Option 3: Both at once

```bash
npm install
npm run dev:all   # Starts frontend (3000) + backend (3001)
```

---

## Architecture

```
Frontend (React)  ◄────fetch────►  Backend (Express)
     :3000                          :3001
                                      │
                              ┌───────┴───────┐
                              │  SQLite (WAL)   │
                              └───────┬───────┘
                                      │
                              ┌───────┴───────┐
                              │  Nuclei CLI     │
                              │  (spawn child)  │
                              └─────────────────┘
```

---

## How It Works with Nuclei

1. **Create Monitor** → Frontend sends POST /api/monitors
2. **Trigger Scan** → Frontend sends POST /api/scans
3. **Backend runs Nuclei** → `spawn('nuclei', ['-u', url, '-j', ...])`
4. **Parse JSON output** → Each line = one finding
5. **Save to DB** → Findings stored, terminal output saved
6. **Poll for updates** → Frontend refreshes every 5 seconds

### Nuclei Flags Used

| Flag | Source | Description |
|------|--------|-------------|
| `-u` | Monitor URL | Target |
| `-tags` | Categories | Template tags |
| `-rl` | Advanced | Rate limit |
| `-timeout` | Advanced | Timeout |
| `-j` | Fixed | JSON output (JSONL format) |
| `-H` | Advanced | User-Agent |

---

## Switch to PostgreSQL

1. Uncomment `postgres` service in `docker-compose.yml`
2. Change env vars in `docker-compose.yml`:
   ```yaml
   - DB_DRIVER=postgresql
   - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/sentinel
   ```
3. Update `backend/src/db/connection.ts` (see comments)
4. `docker-compose --profile pg up -d --build`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/auth/status` | Whether a password is required |
| `POST` | `/api/auth/login` | Exchange password for a token |
| `GET` | `/api/monitors` | List monitors |
| `POST` | `/api/monitors` | Create monitor |
| `PATCH` | `/api/monitors/:id` | Update monitor |
| `DELETE` | `/api/monitors/:id` | Delete monitor (+ its scans) |
| `GET` | `/api/scans` | List scans (with findings) |
| `GET` | `/api/scans/:id` | Scan details |
| `POST` | `/api/scans` | Queue a scan |
| `POST` | `/api/scans/:id/stop` | Stop a running/queued scan |
| `GET` | `/api/scans/queue` | Current queue state |
| `GET` | `/api/scans/:id/stream` | Live terminal output (SSE) |
| `GET` | `/api/templates` | Template categories + counts |
| `GET` | `/api/templates/search?q=` | Search template ids |
| `POST` | `/api/templates/update` | Run `nuclei -update-templates` |
| `GET` | `/api/export` | Export all data (JSON) |
| `GET` | `/api/notifications/channels` | List channels |
| `PATCH` | `/api/notifications/channels/:id` | Update channel |
| `GET` | `/api/settings` | Get settings |
| `PATCH` | `/api/settings` | Update settings |

### Authentication

Set `AUTH_PASSWORD` (env var) to require a login. All `/api/*` routes then require a
`Bearer` token obtained from `POST /api/auth/login`. Leave it unset to run open (e.g.
behind a VPN or for local use).

---

## Project Structure

```
sentinel/
├── docker-compose.yml          # Docker orchestration
├── Dockerfile                  # Multi-stage build
├── src/                        # Frontend (React)
│   ├── api.ts                  # API client with fallback
│   ├── contexts/               # React contexts
│   ├── pages/                  # Route pages
│   └── ...
├── server/                     # Backend API
│   ├── index.js                # Express server + Nuclei
│   ├── db.js                   # JSON-file database
│   └── package.json            # CommonJS module
└── dist/                       # Production build
```

---

## License

MIT
