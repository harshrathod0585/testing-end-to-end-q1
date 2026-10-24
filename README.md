# Notes API – Starter Repository

## One‑command start

```bash
docker compose up
```

The stack consists of three containers:

| Service       | Purpose                                   | Port |
|---------------|-------------------------------------------|------|
| **api**       | Node 20 + Express REST API                | 8080 |
| **db**        | PostgreSQL 15 (data persisted in volume)  | –    |
| **mock-service** | Tiny Express server that records any external calls | 8090 |

When everything is healthy you can:

* `GET http://localhost:8080/health` → `{"ok":true}`
* `POST http://localhost:8080/login` with `{ "email": "...", "password": "..." }` → `{ "token": "…" }`

### Seeded users

| Email               | Password |
|---------------------|----------|
| alice@example.com   | alicepwd |
| bob@example.com     | bobpwd   |

These accounts are created automatically on container start (see `src/seed.js`).

## Your task

Implement the **Notes** CRUD API under `/notes`:

| Method | Path            | What it should do |
|--------|-----------------|-------------------|
| `GET`  | `/notes`        | Return all notes belonging to the authenticated user |
| `POST` | `/notes`        | Create a note (`title`, `content`) for the user |
| `GET`  | `/notes/:id`    | Return a single note **only if it belongs to the user** |
| `PUT`  | `/notes/:id`    | Update `title` and/or `content` of a note you own |
| `DELETE`| `/notes/:id`  | Delete a note you own |

All routes must:

* Require a valid JWT (`Authorization: Bearer <token>`).  
* Return **400** for missing/invalid fields.  
* Return **401** when the token is missing or invalid.  
* Return **403** if a user tries to access another user’s note.  
* Store timestamps (`created_at`, `updated_at`) in ISO‑8601 format.  
* When the environment variable `FAKE_NOW` is set (ISO‑8601 string) the service should use that value as the current time – this lets the test suite control time.

### Non‑functional requirements

* **Concurrency:** parallel requests must not create duplicate notes or corrupt data.  
* **Resilience:** data persists across container restarts (Postgres volume).  
* **Time handling:** all timestamps returned in responses are ISO‑8601 strings, respecting time zones.  

## Rules

* **Time box:** 3 hours of focused work (you have 1 day to submit).  
* You may use any open‑source libraries, but **no external services**.  
* AI tools (Copilot, ChatGPT, etc.) are allowed.  
* The project **must** start with a single command `docker compose up`.  
* Do **not** modify the existing health or login endpoints – they are already functional.  
* When finished, push the repository to a public Git host and share the URL.

## Submission checklist

1. All CRUD endpoints work as described.  
2. The test suite (`npm test`) passes.  
3. `README.md` updated with any extra run‑time instructions (if needed).  
4. `NOTES.md` filled with your design decisions, trade‑offs, and assumptions.

Good luck! 🚀