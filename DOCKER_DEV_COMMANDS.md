# MooreSkillUp — Docker Dev Commands Cheatsheet

## ▶️  Start everything (DEV mode — hot reload)
```bash
docker compose up
```
> Open browser at http://localhost:3000
> Save any `.ts`, `.tsx`, or `.css` file → browser refreshes automatically within ~1 second.

---

## ⏹️  Stop everything
```bash
docker compose down
```

---

## 🔄  Full reset (wipe containers + volumes, start fresh)
```bash
docker compose down -v
docker compose up --build
```
> Use `-v` to also wipe the database and Next.js cache.

---

## 🏗️  Rebuild ONLY the web (e.g. after changing package.json or next.config.mjs)
```bash
docker compose up --build web
```
> Only needed if you add/remove an npm package or change a config file.
> For `.ts`/`.tsx` changes, you do NOT need to rebuild — just save the file.

---

## 🔁  Restart just the backend (after changing Python files)
```bash
docker compose restart api
```
> Django also auto-reloads on Python file save because `./backend` is already mounted.

---

## 📋  View live logs
```bash
# All services
docker compose logs -f

# Frontend only
docker compose logs -f web

# Backend only
docker compose logs -f api
```

---

## 🧹  Clean everything (nuclear option)
```bash
docker compose down -v --rmi all
docker compose up --build
```

---

## 📦  Production build (only when deploying or verifying prod behavior)
To bypass dev mode and run a production build, tell compose to ignore the override file:
```bash
docker compose -f docker-compose.yml up --build
```
> Runs `next build` + `next start`. Takes ~4 minutes.

---

## ✅  Summary: When do I need to rebuild?

| Change | Action needed |
|---|---|
| Edit `.ts` / `.tsx` / `.css` file | **Nothing** — hot reload handles it |
| Edit Python (`.py`) file | **Nothing** — Django auto-reloads |
| Add/remove npm package | `up --build web` |
| Change `next.config.mjs` | `up --build web` |
| Change `docker-compose*.yml` or `Dockerfile` | `up --build` |
| Wipe database and start fresh | `down -v` then `up --build` |
