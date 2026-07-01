# Connect

Connect is a full-stack social media platform combining short-form video (**Reels**), photo/text posts, a music sharing hub, and real-time chat — built as a Django REST + WebSocket backend with a React (Vite) Progressive Web App frontend.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
  - [3. Running Both Together](#3-running-both-together)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Real-Time Chat (WebSocket)](#real-time-chat-websocket)
- [Data Model](#data-model)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Feed & Posts** — create text/photo posts with multiple media attachments, likes, and comments
- **Reels** — vertical short-form video feed with its own like/comment stream
- **Connects** — lightweight, Twitter-style short text updates (280 chars)
- **Music** — upload and stream tracks with title, artist, and cover art
- **Real-time chat** — public and private rooms over WebSockets, backed by Django Channels
- **Notifications & Love Notes** — in-app notification panel and a dedicated "love note" messaging panel
- **Profiles** — bio, avatar, and per-user content
- **Progressive Web App** — installable frontend with a service worker, manifest, and app icons
- **JWT authentication** — stateless auth shared between the REST API and WebSocket connections

## Tech Stack

**Backend**
- [Django](https://www.djangoproject.com/) — web framework
- [Django REST Framework](https://www.django-rest-framework.org/) — REST API
- [Django Channels](https://channels.readthedocs.io/) + `channels_redis` — ASGI/WebSocket support for chat
- [Simple JWT](https://django-rest-framework-simplejwt.readthedocs.io/) — token authentication (REST + WebSocket)
- `django-cors-headers` — CORS handling for the separate frontend origin
- SQLite (default, dev) — swap for Postgres/MySQL in production

**Frontend**
- [React 18](https://react.dev/) + [Vite 5](https://vitejs.dev/) — SPA scaffold and dev server
- [React Router](https://reactrouter.com/) — client-side routing
- [Axios](https://axios-http.com/) — HTTP client
- Native Service Worker + Web App Manifest — PWA/installable support

## Project Structure

```
Connect/
├── manage.py                  # Django entry point
├── connect/                   # Django project settings
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py                 # ASGI app + WebSocket routing
│   ├── wsgi.py
│   └── token_auth_middleware.py  # JWT auth for WebSocket connections
├── core/                      # Main Django app
│   ├── models.py               # User, Post, Reel, Connect, Music, Chat, Like, Comment
│   ├── views.py / api_urls.py  # REST endpoints
│   ├── serializers.py
│   ├── chat_views.py / chat_urls.py / chat_serializers.py / chat_utils.py
│   ├── consumers/chat.py       # WebSocket consumer
│   ├── routing.py              # WebSocket URL patterns
│   └── migrations/
├── frontend/                  # React + Vite PWA
│   ├── src/
│   │   ├── pages/               # Home, Reels, Chat, Music, Profile, Upload, Login
│   │   ├── components/          # PostCard, VideoReel, BottomNav, GlobalMusicPlayer, etc.
│   │   ├── services/             # api.js, ws.js, chat.js, media.js, store.js, notify.js, assets.js
│   │   └── context/             # MusicPlayerContext
│   ├── public/icons/            # PWA icons
│   ├── manifest.json
│   └── sw.js                    # Service worker
├── media/                     # User-uploaded content (gitignored)
├── static/                    # Collected static files (gitignored)
└── Test/1.py                  # Manual WebSocket smoke-test script
```

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Redis (required by `channels_redis` for the WebSocket channel layer)

## Getting Started

### 1. Backend Setup

```bash
cd Connect

# create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# install dependencies
pip install django djangorestframework djangorestframework-simplejwt ^
    channels channels_redis django-cors-headers websockets

# apply migrations
python manage.py migrate

# create an admin user
python manage.py createsuperuser

# start Redis separately (required for chat), then run the server
# with Channels, manage.py runserver will serve both HTTP and WebSocket
python manage.py runserver
```

> **Note:** No `requirements.txt` is currently checked in — the packages above are inferred from `settings.py`. Consider running `pip freeze > requirements.txt` once your environment is set up so setup is reproducible.

The API will be available at `http://localhost:8000/api/`, the Django admin at `http://localhost:8000/admin/`, and the chat WebSocket endpoint at `ws://localhost:8000/ws/chat/<room_name>/`.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on Vite's default port. Configure the API base URL in `frontend/src/services/api.js` if your backend isn't on the same origin.

### 3. Running Both Together

Run the backend (`python manage.py runserver`) and frontend (`npm run dev`) in separate terminals. In development, CORS is fully open (`CORS_ALLOW_ALL_ORIGINS = True`) so the two can run on different ports. See `frontend/HOSTING.md` for notes on serving the built frontend from Django in production.

## Environment Variables

The backend currently uses hardcoded development defaults in `settings.py` (`DEBUG = True`, an insecure `SECRET_KEY`, `ALLOWED_HOSTS = ['*']`, SQLite). **None of this is production-safe.** Before deploying, move these into environment variables, for example:

| Variable | Purpose | Example |
|---|---|---|
| `DJANGO_SECRET_KEY` | Django secret key | `(generate a new one)` |
| `DJANGO_DEBUG` | Debug mode | `False` |
| `DJANGO_ALLOWED_HOSTS` | Allowed hostnames | `connect.example.com` |
| `DATABASE_URL` | Production database | `postgres://...` |
| `REDIS_URL` | Channels layer backend | `redis://localhost:6379` |

## API Reference

All REST endpoints are mounted under `/api/` via a DRF `DefaultRouter`.

| Endpoint | Description |
|---|---|
| `POST /api/token/` | Obtain a JWT access/refresh token pair |
| `POST /api/token/refresh/` | Refresh an access token |
| `/api/posts/` | CRUD for feed posts |
| `/api/reels/` | CRUD for video reels |
| `/api/connects/` | CRUD for short text "Connects" |
| `/api/musics/` | CRUD for music tracks |
| `/api/users/` | User accounts/profiles |
| `GET /api/chat/rooms/` | List chat rooms |
| `GET /api/chat/messages/` | List messages for a room |

Likes and comments use Django's generic relations, so the same `Like`/`Comment` models attach to posts, reels, connects, and music — check `core/views.py` and `core/serializers.py` for the exact nested/action routes exposed per viewset.

## Real-Time Chat (WebSocket)

Chat runs over Django Channels rather than REST:

- **Endpoint:** `ws://<host>/ws/chat/<room_name>/`
- **Auth:** a JWT is passed on the connection (see `connect/token_auth_middleware.py`, which authenticates WebSocket connections the same way the REST API does)
- **Rooms:** public or private (`ChatRoom.room_type`), tracked with a participant list and last-message timestamp
- **Messages:** persisted via `ChatMessage`, ordered by creation time, and support both room-wide and private (`recipient_username`) delivery with client-generated dedupe IDs (`client_message_id`)

`Test/1.py` is a minimal standalone script for manually smoke-testing a WebSocket connection against a running backend — useful when debugging the chat consumer in isolation.

## Data Model

Core entities, defined in `core/models.py`:

- **User** — custom user model (`AUTH_USER_MODEL = 'core.User'`) with bio and profile picture
- **Post / Reel / Connect / Music** — the four primary content types, each owned by a `User`
- **MediaFile** — attachments linked to a `Post`
- **Like / Comment** — generic, reusable across all content types via `ContentType` + `GenericForeignKey`
- **ChatRoom / ChatMessage** — real-time messaging

## Deployment

See `frontend/HOSTING.md` for frontend hosting/build notes. For the backend, at minimum:

- Set `DEBUG = False` and a real `SECRET_KEY`
- Lock down `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
- Switch to a production database (Postgres recommended)
- Run Redis as the Channels layer backend
- Serve ASGI (not WSGI) so WebSocket chat works — e.g. via `daphne` or `uvicorn`
- Collect static files (`python manage.py collectstatic`) and serve `media/` from proper storage (e.g. S3) rather than local disk

## Roadmap

Ideas for future work — not yet implemented:

- Automated test coverage for chat consumers and REST viewsets
- `requirements.txt` / `pyproject.toml` for reproducible backend installs
- CI pipeline (see `.github/`)
- Push notifications for chat and social interactions

## Contributing

1. Fork the repo and create a feature branch
2. Make your changes with clear, focused commits
3. Open a pull request describing what changed and why

## License

No license file is currently included. Add a `LICENSE` file to specify how this project may be used, modified, and distributed.
