# SamDang

SamDang is a Thai-language task management application for LINE groups. It combines a LINE Messaging API bot with a LIFF web application so group members can create, view, update, and check tasks without leaving LINE.

## Features

- Register LINE groups and their members through the bot.
- Create tasks for members of a selected group.
- View every task in a group as a joined group member.
- Edit a task only when you are its assignee or assigner.
- Check a completed task only when you are its assigner.
- Track task status, description, due date, assigner, assignee, and checker.
- Manage application roles through protected admin pages.
- Send each joined group a daily list of in-progress tasks at 07:00 Asia/Bangkok time.
- Mark overdue tasks and display a mobile-responsive Thai interface.
- Authenticate frontend API calls with LINE access tokens verified by the Go API.

## Application flow

```text
LINE user
   |
   +-- LINE webhook --> Go bot --> PostgreSQL
   |
   +-- LIFF frontend --> /front-api/* --> Go frontHandler --> PostgreSQL
                                      |
                                      +--> LINE profile API (token verification)

Internet --> nginx (HTTPS)
               +-- /bot/*       --> bot:8080
               +-- /front/*     --> frontend:8081
               +-- /front-api/* --> frontHandler:8082
```

## Technology stack

| Component | Technology | Purpose |
| --- | --- | --- |
| `bot/` | Go, Gin, LINE Bot SDK | LINE webhook commands and scheduled notifications |
| `frontend/` | Next.js 16, React 19, TypeScript | Thai LIFF user interface |
| `frontHandler/` | Go, Gin, pgx | Authenticated frontend API and authorization |
| `db/` | PostgreSQL 16 | Users, groups, memberships, tasks, roles, and triggers |
| `proxy/` | nginx, Docker Compose | HTTPS and path-based reverse proxy |

## User roles and task permissions

Application roles include `member`, `manager`, and `admin`. Administrative endpoints verify the caller's role on the server; hiding a control in the frontend is not treated as authorization.

Task permissions are enforced by `frontHandler` and its database queries:

| Action | Permission |
| --- | --- |
| View group tasks | Any joined member of that group |
| Create a task | Joined group member; the assignee must also belong to the group |
| Edit a task | Task assignee or task assigner |
| Check a completed task | Task assigner only |
| View or edit user roles | Admin only |

## LINE bot commands

Send these exact messages to the bot:

### In a LINE group

```text
@SamDang ลงทะเบียนกลุ่ม
@SamDang งานที่ดำเนินการในกลุ่ม
```

Group registration requires a manager or admin role.

### In a direct chat with the bot

```text
@SamDang รหัส admin
@SamDang รหัส manager
@SamDang เพิ่ม admin <admin code>
@SamDang เพิ่ม manager <manager code>
```

Retrieving role codes is restricted to admins. Treat all generated role codes as secrets.

## LIFF usage

1. Open the SamDang LIFF application from LINE.
2. Sign in through LINE when prompted.
3. Select one of your registered groups on the **งาน** page.
4. Choose an action:
   - **แสดงงาน** — view all tasks in the selected group.
   - **เพิ่มงาน** — assign a new task to a group member.
   - **แก้ไขงาน** — edit tasks for which you are the assignee or assigner.
   - **ตรวจงาน** — check completed tasks that you assigned.
5. Use **กลับ** to return to the group-selection page.

The deployed frontend is mounted below `/front/`. API calls use `/front-api/` and are forwarded to the internal Go service.

## Requirements

- Docker Engine with Docker Compose
- A LINE Developers provider with:
  - Messaging API channel
  - LINE Login channel
  - LIFF application
- A domain with HTTPS for production webhook and LIFF endpoints

For development without Docker, install:

- Go 1.25 or later
- Node.js 22 or later
- PostgreSQL 16

## Environment configuration

Create a root `.env` file. Do not commit real credentials.

```dotenv
LINE_CHANNEL_SECRET=your-messaging-api-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-messaging-api-channel-access-token
LINE_USER_HMAC_KEY=generate-a-long-random-secret

POSTGRES_USER=samdang
POSTGRES_PASSWORD=replace-with-a-strong-password
POSTGRES_DB=AppDB
DB_URL=postgres://samdang:password@localhost:5432/AppDB?sslmode=disable

NEXT_PUBLIC_LINE_LIFF_ID=your-liff-id
```

For the production nginx template, create `proxy/nginx/.env`:

```dotenv
NGINX_SERVER_NAMES=example.com
```

The following values are supplied by the Compose files when services run in Docker:

- Bot port: `8080`
- Frontend port: `8081`
- Frontend API port: `8082`
- Internal database host: `db:5432`

## Docker deployment

All application services share the external Docker network named `samdang`.

```bash
docker network create samdang
```

Build and start the services from the repository root:

```bash
docker compose -f db/docker-compose.db.yml up -d --build
docker compose -f bot/docker-compose.bot.yml up -d --build
docker compose -f frontHandler/docker-compose-fronth.yml up -d --build
docker compose -f frontend/docker-compose.frontend.yml up -d --build
docker compose -f proxy/docker-compose.def.yml up -d
```

The PostgreSQL container runs the scripts in `db/init/` only when it initializes a new data volume:

1. `01-create-db.sql`
2. `02-schema.sql`
3. `03-trigger.sql`

After deployment, configure LINE Developers with URLs matching your domain:

- Messaging API webhook: `https://example.com/bot/callback`
- LIFF endpoint: `https://example.com/front/`

Keep the frontend route under `/front/`; nginx uses that prefix as a mount point.

## Local development

Start PostgreSQL first and make sure `DB_URL` points to it.

### Bot

```bash
cd bot
go mod download
go run .
```

The bot listens on `http://localhost:8080` by default.

### Frontend API

```bash
cd frontHandler
go mod download
go run .
```

The API listens on `http://localhost:8082` by default.

### Frontend

Create `frontend/.env` if the LIFF ID is not already available to the frontend:

```dotenv
NEXT_PUBLIC_LINE_LIFF_ID=your-liff-id
FRONT_HANDLER_INTERNAL_URL=http://localhost:8082
```

Then run:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000`. Real authenticated workflows must be opened through a configured LIFF application because the API expects a valid LINE access token.

## Tests and code quality

Frontend:

```bash
cd frontend
npm run lint
npm test
npx tsc --noEmit
npm run build
```

Go services:

```bash
cd bot
go test ./...
go build ./...

cd ../frontHandler
go test ./...
go build ./...
```

## Project structure

```text
SamDang/
|-- bot/           LINE webhook bot and scheduled task notifications
|-- db/            PostgreSQL Compose files, schema, and triggers
|-- frontend/      Next.js LIFF application
|-- frontHandler/  Authenticated API used by the frontend
|-- proxy/         nginx, TLS, and reverse-proxy configuration
|-- .env           Local secrets (ignored by Git)
```