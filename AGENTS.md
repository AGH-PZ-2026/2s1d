# AGENTS.md - System Zarządzania Inwentaryzacją AGH

## Setup & Execution
- **Initialization**: Run `sh setup.sh` to initialize the project. It handles `.env.example` -> `.env` copying and starts Docker Compose (`docker compose up --build -d`).
- **Endpoints**: Frontend runs on `http://localhost:5173`, Backend on `http://localhost:8000`.

## Backend (`/backend`)
- **Package Manager**: Uses **`uv`** for dependency management (relies on `pyproject.toml` and `uv.lock`). Do not use `pip` or `poetry` directly for adding packages.
- **Commands**:
  - Tests: `pytest`
  - Linting/Formatting: `ruff check .` and `ruff format .`
- **Database**: PostgreSQL using SQLAlchemy and Alembic. Migrations must be run via Alembic.

## Frontend (`/frontend`)
- **Package Manager**: `npm`
- **Commands**: 
  - Tests: `npm run test` (Vitest)
  - Linting/Formatting: `npm run lint` (ESLint) and `npm run format:check` (Prettier)

## Domain Specifics & Constraints
- The system is for managing physical objects (electronic devices, books, cables, etc.), **not** for storing device measurement data. Avoid scope creep in this direction.
- **Roles & Auth**: By default, new users have NO access. Permissions must be explicitly granted. SSO AGH is the primary login method.
- **Important**: The iterative model strictly forbids scope creep beyond defined stages in the requirements. Do not propose features outside the requested boundaries.