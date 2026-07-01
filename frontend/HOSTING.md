# Hosting and mobile access

## Run locally on your Wi‑Fi
1. Install dependencies.
2. Start the frontend so it binds to all interfaces:
   ```bash
   npm run dev -- --host 0.0.0.0
   ```
3. Find your computer’s local IP address.
4. On your phone, open:
   ```
   http://YOUR-LAN-IP:5173
   ```

Your API also needs to be reachable from the phone. Set `VITE_API_BASE` to the backend’s reachable URL before building or running.

## Deploy online
Use a static host for the frontend and a separate host for the backend API.

Frontend options:
- Vercel
- Netlify
- Cloudflare Pages

Backend options:
- Render
- Railway
- Fly.io
- A VPS with Docker

### Typical setup
- Frontend build command: `npm run build`
- Frontend output folder: `dist`
- API base URL: set `VITE_API_BASE` to your deployed backend URL
- Make sure the backend allows CORS from the frontend domain

## Quick mobile checklist
- Frontend served over HTTPS for easiest phone access
- Backend URL uses HTTPS too
- `VITE_API_BASE` points to the deployed API
- Rebuild the frontend after changing environment variables
