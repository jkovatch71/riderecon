# Trail App MVP

This starter app includes a Next.js frontend and a FastAPI backend for the San Antonio trail conditions MVP.

## Stack
- Frontend: Next.js + React + TypeScript + Tailwind
- Backend: FastAPI + Python
- Database/Auth/Storage: Supabase (optional until you wire it)

## Run locally

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
Use Python 3.13 for the backend.

```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Supabase wiring

1. In Supabase, open the SQL editor and run `backend/app/db/schema.sql`.
2. In `backend/.env`, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. In `frontend/.env.local`, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Important: never commit your service role key.

If the backend does not see a Supabase URL and service role key, it falls back to seeded in-memory data so the app still runs.

## Current MVP behavior
- homepage greeting and summary
- trail list and trail detail pages
- report submission form
- summarized report history
- weather warning placeholder
- manual image-review flow placeholder

## Next suggested milestones
- wire report submission to Supabase
- add auth with Supabase Auth
- add profile editing
- add favorite trails
- package web MVP for testing with local riders
