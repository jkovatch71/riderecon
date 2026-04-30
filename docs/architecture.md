# Ride Recon Architecture

Ride Recon uses a modern full-stack architecture:

- Frontend: Next.js (Vercel)
- Backend: FastAPI (Render)
- Database/Auth: Supabase (Postgres)
- Weather Data: OpenWeather API

## Flow

User → Frontend → Backend → Supabase / Weather API → Response