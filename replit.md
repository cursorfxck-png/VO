# VogueX

A fashion-forward social platform where users share posts, follow each other, chat in real-time, and view stories — similar to Twitter/Instagram with a dark luxury aesthetic.

## Run & Operate

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite frontend (port 5000) |
| `python3 backend/main.py` | Start FastAPI backend (port 8000) |
| `npm run build` | Production build |

**Required env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (set in Replit Secrets)

## Stack

- **Frontend:** React 18 + Vite 5, React Router v6, port 5000
- **Backend:** Python 3.11 + FastAPI + Uvicorn, port 8000
- **Database/Auth:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Styling:** Plain CSS (`src/index.css`)
- **Icons:** Remix Icons (CDN)

## Where things live

```
src/
  components/
    GuestFeed.jsx   # Public home feed for unauthenticated visitors
    LoginModal.jsx  # Inline login/signup modal (shown on guest interactions)
    Messages.jsx    # Chat — 1334 lines; keyboard-safe flex layout on mobile
    Sidebar.jsx     # Desktop nav (Home, Explore, Messages, Profile — no Music)
    SinglePost.jsx  # /post/:id — public, no auth required
    PublicProfile.jsx # /u/:username — public, no auth required
  utils/
    cache.js        # Chunked localStorage cache (512KB chunks, TTL-based)
    contentModeration.js
  supabaseClient.js   # persistSession:true, autoRefreshToken:true, storageKey:'voguex-auth-token'
  App.jsx             # Root: sessionLoading state, public routes, presence heartbeat
  index.css           # All styles (2340+ lines)
backend/
  main.py             # FastAPI — /api/posts, /api/feed, /api/profiles/:username, etc.
  requirements.txt
COMPLETE_DATABASE_SETUP.sql  # Full Supabase schema — run once in SQL Editor
```

## Architecture decisions

- **No Google OAuth** — Email/password auth only via Supabase Auth
- **Dual-server**: Vite frontend (5000) + FastAPI backend (8000) run in parallel workflows
- **Session persistence**: `sessionLoading` state gates the Auth component; `getSession()` resolves first so refreshing never causes a re-login flash
- **Public routes first**: Unauthenticated visitors see `GuestFeed` at `/`; `/post/:id` and `/u/:username` are always accessible without login
- **Presence heartbeat**: `updatePresence` fires every 30 s via `setInterval`; `pagehide` + `visibilitychange` mark offline immediately when tab is closed/hidden; `beforeunload` covers desktop browsers
- **Keyboard-safe chat**: `.messages-view { height:calc(100dvh - 60px) }` (subtracts mobile nav so input never hides behind it) + `flex:1; min-height:0` on scroll area + `flex-shrink:0` on input — no `position:fixed`
- **Client-side chunked cache**: `src/utils/cache.js` splits large JSON into 512KB localStorage chunks to avoid quota errors

## Product

- Public home feed at `/` — identical layout to logged-in (same sidebar, same tabs, same mobile nav); "Log in" / "Sign up" replace the user profile; login modal on like/comment/share/post
- Feed (For You / Trending / Following tabs) with real-time Supabase subscriptions
- Posts with images, videos, location, likes, comments
- Stories (24h expiry, story viewer with warp animation)
- Direct messages with typing indicators, file attachments, emoji picker (keyboard-safe on mobile)
- Public profiles at `/u/:username`, individual posts at `/post/:id` — no login needed
- Admin verification panel for verified badges
- Pull-to-refresh on mobile, bottom nav bar (Home, Explore, Messages, Profile)

## User preferences

- Dark luxury aesthetic — black background, purple accent (`#d946ef`)
- No Google login, no Music tab
- Backend must be Python (FastAPI)
- All site data cached in browser in chunks for no-lag experience
- Sessions persist across page refreshes/browser restarts — no re-login ever

## Gotchas

- Run `COMPLETE_DATABASE_SETUP.sql` in Supabase SQL Editor before first use
- The backend (`port 8000`) is a console workflow — the webview only shows the Vite frontend (`port 5000`)
- Feed.jsx has Windows CRLF line endings — use Python/bash for edits, not the edit tool
- Storage buckets needed: `avatars`, `images`, `videos`, `stories`, `chat-files`
- `user_presence` table must have columns: `user_id`, `is_online`, `last_seen`

## Pointers

- Skills: `.local/skills/database`, `.local/skills/workflows`, `.local/skills/environment-secrets`
- Supabase dashboard: https://supabase.com/dashboard/project/ewefbbswaaheqkqsfbzx
