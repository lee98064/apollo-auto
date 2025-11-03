# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Apollo Auto is an automated attendance system consisting of two main components:
- **apollo-auto-server**: Express.js backend API with Prisma ORM and MySQL database
- **apollo-auto-extention**: Chrome extension built with Vue 3 and Vite

The system automates check-in/check-out processes for the Apollo HR system (mayohr.com), manages scheduled jobs with timezone support, and sends notifications via Telegram.

## Development Commands

### Root Level
```bash
# Format code across all projects
yarn biome format --write .

# Lint code across all projects
yarn biome lint --write .
```

### Server (apollo-auto-server)
```bash
cd apollo-auto-server

# Development with hot reload
yarn dev

# Production build and start
yarn start

# Database operations
yarn db:generate    # Generate Prisma client
yarn db:dev        # Create and apply migrations in dev
yarn db:deploy     # Apply migrations in production

# Format and lint
yarn biome format --write .
yarn biome lint --write .
```

### Extension (apollo-auto-extention)
```bash
cd apollo-auto-extention

# Development server (browser preview)
yarn dev

# Build for Chrome extension
yarn build

# Preview production build
yarn preview
```

### Docker
```bash
# Start all services (MySQL, phpMyAdmin, server)
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f apollo-auto-server
```

## Architecture

### Server Architecture

**Entry Point**: `src/index.ts` initializes Express app, OpenAPI validation, Swagger docs, routes, and JobManager.

**Job Scheduling**: The `JobManager` class (`src/jobManager.ts`) uses `node-schedule` to run recurring tasks:
- `SET_JOB_STATUS`: Updates next execution times for user jobs (every second)
- `CHECK_IN`: Processes scheduled check-in jobs
- `CHECK_OUT`: Processes scheduled check-out jobs
- `REFRESH_APOLLO_COOKIES`: Refreshes stored Apollo cookies (daily at noon)

Jobs are managed per-user with timezone support. Each job has a status (PENDING/SUCCESS/FAILED/SKIPPED) tracked in the database.

**Authentication**: JWT-based auth with Bearer tokens. Middleware in `src/middleware/authMiddleware.ts` validates tokens and attaches user context. Tokens stored in `Token` table with user relation.

**API Structure**:
- Routes (`src/routes/`): Define Express routes for auth, jobs, cookies, telegram
- Controllers (`src/controller/`): Handle request/response logic
- Services (`src/service/`): Business logic and external integrations
- DTOs (`src/dto/`): Request/response validation schemas

**Database**: Prisma schema (`src/prisma/schema.prisma`) defines:
- `User`: Account with timezone and relations
- `Token`: JWT tokens for auth
- `Job`: Scheduled tasks with execution tracking
- `ApolloCookie`: Stored cookies for Apollo API access
- `TelegramToken`: Bot credentials for notifications

**OpenAPI**: Complete API spec in `src/swagger/openapi.yaml`. Auto-validated by `express-openapi-validator`. Swagger UI available at `/docs`.

**Telegram Integration**: `TelegramService` (`src/service/telegramService.ts`) sends notifications about job execution results. Supports multiple tokens per user.

**Apollo Integration**: Job services (`src/service/jobs/punch.ts`) interact with Apollo HR system using stored cookies. Cookie refresh service keeps sessions alive.

### Extension Architecture

**Tech Stack**: Vue 3 + Vue Router + Element Plus + Vite

**Build System**: Vite bundles the extension. `vite.config.js` outputs to `dist/` with proper Chrome extension structure (popup.html, background.js, manifest.json).

**State Management**: `composables/useAppState.js` provides reactive state stored in chrome.storage.local (falls back to localStorage in browser preview). Persists auth token, server URL, and last viewed page.

**Routing**: Vue Router (`src/router/index.js`) manages views:
- `/login`: LoginView
- `/register`: RegisterView
- `/dashboard`: DashboardView (requires auth)
- `/settings`: SettingsView

Route guards redirect based on auth state.

**Background Service Worker**: `src/background/` contains service worker logic for Chrome extension APIs (cookies, alarms, webRequest).

**API Communication**: Extension communicates with the backend server. Server URL configurable in settings (supports localhost for dev).

## Environment Variables

### Server (.env)
```bash
DATABASE_URL=mysql://user:password@host:3306/dbname
JWT_SECRET=your_jwt_secret_key
JWT_ACCESS_TTL=365d  # Optional, defaults to 365d
CHECK_IN_JOB_SCHEDULE="*/1 * * * * *"  # Optional, cron format
COOKIE_REFRESH_JOB_SCHEDULE="0 0 12 * * *"  # Optional, cron format
APOLLO_BASE_URL=https://apollo.mayohr.com  # Optional
PORT=4000  # Server port
NODE_ENV=dev|production
```

## Code Style

This project uses Biome for formatting and linting with these key rules:
- Single quotes for JS/TS
- 2-space indentation
- 80 character line width
- Semicolons as needed (not always required)
- Trailing commas (ES5 style)

## Testing

No test framework is currently configured. When adding tests, consider the job scheduling logic and API validation as critical areas to cover.

## Database Migrations

Always create migrations for schema changes:
```bash
# In apollo-auto-server
yarn db:dev  # Creates migration and applies it
```

Schema file location: `apollo-auto-server/src/prisma/schema.prisma`

Generated client location: `node_modules/@prisma/client`

## Extension Loading

After building the extension:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `apollo-auto-extention/dist/` directory

## Important Notes

- User timezones are stored and respected for job scheduling (defaults to Asia/Taipei)
- Jobs use HH:mm format (24-hour) for startAt/endAt times
- Cookie refresh runs daily to maintain Apollo session
- Telegram tokens support multiple bots per user with active/inactive toggle
- Extension stores state in chrome.storage.local for persistence across popup sessions
- Server uses tsconfig-paths for cleaner imports (e.g., `import JobManager from 'jobManager'`)
