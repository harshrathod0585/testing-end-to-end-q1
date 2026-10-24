# Design Decisions & Notes

## Architecture

- **Web Framework & Routing**: Built with Node.js 20 and Express.js with modular routing:
  - `/health`: Health check endpoint used by Docker healthchecks.
  - `/login`: User authentication endpoint verifying bcrypt hashes and issuing signed JWTs.
  - `/register`: User registration endpoint validating email/password, ensuring uniqueness, hashing passwords, and returning JWT tokens.
  - `/notes`: Full CRUD operations on notes with JWT authorization enforcement.
- **Authentication & Security**:
  - Stateless JWT tokens signed using `HS256` with configurable `JWT_SECRET`.
  - Password hashing utilizing `bcrypt` with cost factor 10.
  - Dedicated middleware (`src/middleware/auth.js`) validating `Authorization: Bearer <token>` headers, populating `req.user.id`.
- **Database & Storage Layer**:
  - PostgreSQL 15 accessed via `pg.Pool` connection pooling.
  - Relational schema with foreign keys (`user_id REFERENCES users(id) ON DELETE CASCADE`) and index on `user_id` for efficient note retrieval.
  - Automated startup migration and seeding in `src/index.js` with exponential backoff/retry loop to eliminate race conditions while PostgreSQL initializes.
  - Persistent storage through named Docker volume `pgdata`.
- **Concurrency & Data Integrity**:
  - **Row-level locking (`SELECT ... FOR UPDATE`)**: Used in transactional blocks (`BEGIN` / `COMMIT`) for `PUT /notes/:id` and `DELETE /notes/:id` to guarantee lost-update prevention and atomicity under concurrent requests.
  - **In-flight Deduplication & Idempotency**: `POST /notes` supports `Idempotency-Key` headers and deduplicates concurrent in-flight requests from the same user to prevent duplicate notes on simultaneous clicks or retried requests.
- **Time Handling & Test Control**:
  - All timestamps (`created_at`, `updated_at`) are stored as PostgreSQL `TIMESTAMPTZ` and formatted to standard ISO-8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
  - Runtime evaluation of `process.env.FAKE_NOW` allows tests and callers to freeze or simulate arbitrary timestamps.
- **Testing Architecture**:
  - Supertest + Jest test suite covering health checks, authentication, user isolation, CRUD operations, validation edge cases, time manipulation, and concurrency.
  - Dual-mode database layer: connects seamlessly to PostgreSQL in Docker and CI, with seamless zero-config fallback to `pg-mem` for standalone local test execution.

---

## Trade‑offs

1. **In-Flight Deduplication vs Database Unique Constraint on Titles**:
   - *Decision*: In a real-world note-taking application, users frequently create multiple notes with identical or generic titles (e.g. "Meeting Notes", "TODO"). Enforcing `UNIQUE(user_id, title)` would break realistic usage.
   - *Trade-off*: We implemented in-flight request deduplication and `Idempotency-Key` caching. This handles race conditions and prevents duplicate creations without imposing restrictive schema constraints.

2. **Pessimistic Row Locking (`FOR UPDATE`) vs Optimistic Concurrency Control (OCC)**:
   - *Decision*: Used database transactions with `FOR UPDATE` for updates and deletions.
   - *Trade-off*: Avoids requiring clients to send `version` or `etag` headers on every update while guaranteeing zero lost updates under parallel operations.

3. **Dual-Engine Test Support (`pg` + `pg-mem`)**:
   - *Decision*: Configured `src/db.js` to automatically fall back to `pg-mem` when a live PostgreSQL instance is not reachable on the host during unit testing.
   - *Trade-off*: Adds `pg-mem` as a dev dependency, but delivers 100% reliable test suite execution across disparate developer laptops, Docker containers, and CI environments alike without requiring manual DB setup.

---

## Assumptions

- **Access Control & Permissions**:
  - Trying to access, update, or delete a note belonging to another user returns `403 Forbidden` (as specified in the requirements).
  - Accessing a note ID that does not exist at all in the database returns `404 Not Found`.
- **Timestamp Format**:
  - All timestamp representations in JSON responses strictly adhere to ISO-8601 UTC format.
- **Seeded Accounts**:
  - Default seed accounts (`alice@example.com` / `alicepwd` and `bob@example.com` / `bobpwd`) are idempotently inserted at server launch.
- **Token Format**:
  - JWT tokens are passed via standard HTTP header `Authorization: Bearer <token>` and contain the numeric user ID in the `sub` claim.
