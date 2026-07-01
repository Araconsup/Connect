# Connect Frontend (Vite + React)

This folder contains a minimal SPA scaffold for the Connect app (PWA-ready).

Quick start:

```bash
cd frontend
npm install
npm run dev
```

Build for production:

```bash
npm run build
# copy `dist` into Django static files or serve separately
```

Notes:
- The frontend expects the Django backend API on the same origin (or configure `API_BASE` in `src/services/api.js`).
- Service worker is in `sw.js` and the PWA manifest in `manifest.json`.
