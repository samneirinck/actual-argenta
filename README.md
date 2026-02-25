# Actual Argenta

Sync your Argenta bank transactions to [Actual Budget](https://actualbudget.org/).

Uses Playwright for browser automation with VNC access for secure login.

## Features

- 🔐 Secure login via VNC (you enter credentials in a real browser)
- 🔄 Incremental sync (only fetches new transactions)
- 📊 Full resync option when needed
- 🔗 Link Argenta accounts to Actual Budget accounts
- 🚀 One-click sync all linked accounts

## Quick Start

### Docker (Recommended)

```bash
docker run -d \
  --name actual-argenta \
  -p 3000:3000 \
  -v actual-argenta-data:/app/data \
  ghcr.io/samneirinck/actual-argenta:latest
```

Open http://localhost:3000 to access the web UI.

### Local Development

```bash
npm install
npm run dev
```

### Build from Source

```bash
docker compose up --build
```

## How It Works

1. **Login** - Click "Start Login" to open a VNC browser session
2. **Authenticate** - Enter your Argenta credentials in the browser
3. **Configure** - Connect to your Actual Budget server
4. **Link Accounts** - Map Argenta accounts to Actual Budget accounts
5. **Sync** - Click "Sync New" to fetch and import transactions

## Configuration

### Actual Budget

Configure via the web UI:
- **Server URL**: Your Actual Budget server (e.g., `https://actual.example.com`)
- **Password**: Your Actual Budget password

### Docker Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Web server port |
| `VNC_PASSWORD` | `vnc` | VNC access password |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript |
| `npm start` | Run production server |
| `npm run dev` | Run with hot reload |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage |
| `npm run serve` | Build and run with Docker |

## Architecture

```
src/
├── clients/           # External API clients
│   ├── ActualBudgetClient.ts
│   └── ArgentaClient.ts
├── repositories/      # Database access
│   ├── AccountRepository.ts
│   └── ConfigRepository.ts
├── services/          # Business logic
│   ├── SyncService.ts
│   └── TransactionMapper.ts
├── migrations/        # Database migrations
├── types/             # TypeScript interfaces
├── database.ts        # SQLite setup
└── server.ts          # Express server
```

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Web Server**: Express.js
- **Browser Automation**: Playwright
- **Database**: SQLite (better-sqlite3)
- **VNC**: Xvfb + x11vnc + noVNC
- **Testing**: Vitest

## License

MIT
