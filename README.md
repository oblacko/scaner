# Sentinel — Security Monitor

**Nuclei-powered vulnerability monitoring dashboard** with scheduled scans, multi-channel notifications, and real-time reporting.

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
                              │  JSON-file DB   │
                              │  (SQLite-ready) │
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
| `GET` | `/api/monitors` | List monitors |
| `POST` | `/api/monitors` | Create monitor |
| `PATCH` | `/api/monitors/:id` | Update monitor |
| `DELETE` | `/api/monitors/:id` | Delete monitor |
| `GET` | `/api/scans` | List scans |
| `GET` | `/api/scans/:id` | Scan details |
| `POST` | `/api/scans` | Trigger scan |
| `GET` | `/api/notifications/channels` | List channels |
| `PATCH` | `/api/notifications/channels/:id` | Update channel |
| `GET` | `/api/settings` | Get settings |
| `PATCH` | `/api/settings` | Update settings |

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
