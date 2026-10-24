# Notes API

A simple, robust Notes REST API built with Node.js 20, Express, PostgreSQL 15, and JWT authentication.

## One‑command Start

```bash
docker compose up --build
```

The stack consists of three services:

| Service | Purpose | Port |
|---|---|---|
| **api** | Node 20 + Express REST API | 8080 |
| **db** | PostgreSQL 15 (data persisted in Docker volume `pgdata`) | internal |
| **mock-service** | Express server recording external requests | 8090 |

When healthy:
- Health check: `GET http://localhost:8080/health` → `{"ok":true}`
- Login: `POST http://localhost:8080/login` with `{ "email": "...", "password": "..." }` → `{ "token": "..." }`

### Seeded Users

These accounts are created automatically on database startup:

| Email | Password |
|---|---|
| `alice@example.com` | `alicepwd` |
| `bob@example.com` | `bobpwd` |

---

## API Endpoints

### 1. Authentication

#### Register a new user
- **POST** `/register` (also aliased at `/auth/register`)
- **Body:** `{ "email": "user@example.com", "password": "secretpassword" }`
- **Response:** `201 Created` with `{ "token": "...", "user": { "id": ..., "email": "..." } }`

#### Log in
- **POST** `/login` (also aliased at `/auth/login`)
- **Body:** `{ "email": "alice@example.com", "password": "alicepwd" }`
- **Response:** `200 OK` with `{ "token": "..." }`

---

### 2. Notes CRUD (`/notes`)

All routes require `Authorization: Bearer <token>`.

| Method | Path | Description | Status Codes |
|---|---|---|---|
| `GET` | `/notes` | List all notes belonging to the authenticated user | `200`, `401` |
| `POST` | `/notes` | Create a note (`title`, `content`) for the user | `201`, `400`, `401` |
| `GET` | `/notes/:id` | Return a single note (only if owned by the user) | `200`, `400`, `401`, `403`, `404` |
| `PUT` | `/notes/:id` | Update `title` and/or `content` of an owned note | `200`, `400`, `401`, `403`, `404` |
| `DELETE` | `/notes/:id` | Delete an owned note | `200`, `400`, `401`, `403`, `404` |

#### Example Usage

```bash
# 1. Login and obtain token
TOKEN=$(curl -s -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"alicepwd"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. Create a note
curl -X POST http://localhost:8080/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Meeting Notes","content":"Antigravity discussion"}'

# 3. List notes
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/notes

# 4. Update note
curl -X PUT http://localhost:8080/notes/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Updated Meeting Notes"}'

# 5. Delete note
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:8080/notes/1
```

---

## Running Tests

### Option A: Running tests inside Docker container

```bash
docker compose up -d
docker compose exec api npm test
```

### Option B: Running tests locally

```bash
npm install
npm test
```

The test suite runs 31 comprehensive tests covering authentication, authorization, access control isolation, input validation, time travel with `FAKE_NOW`, and concurrency handling.

---

## Design and Architecture

Detailed documentation of architecture, trade-offs, and assumptions is available in [NOTES.md](file:///Users/harshrathod/testing-end-to-end-q1/NOTES.md).
