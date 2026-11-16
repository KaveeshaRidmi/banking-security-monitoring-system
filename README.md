# Banking Security Monitoring System

React + FastAPI + PostgreSQL + Tailwind CSS, run with Docker.

## Features
- JWT login with bcrypt password hashing
- Login activity monitoring (user, IP, device, time, result)
- Failed login alerts: account locks after 5 failed attempts (15 min), brute-force detection per IP, new-IP login warning
- User access management: roles (admin, manager, teller), add users, change role, deactivate, unlock
- Security event log with severity filter
- Dashboard: 24-hour chart and latest alerts

## Run
```bash
cp .env.example .env      # then edit the passwords and SECRET_KEY
docker compose up --build
```
- App: http://localhost:8080
- API docs: http://localhost:8000/docs

Default admin: `admin` / `Admin@12345` (or what you set in `.env`). Demo users: `manager1` / `Manager@123`, `teller1` / `Teller@123`. Set `SEED_DEMO=false` and change the admin password before real use.

## Roles
| Role | Can access |
|---|---|
| admin | Everything, including user access |
| manager | Overview, login activity, event log, own sign-ins |
| teller | Own sign-ins only |

## Develop without Docker
```bash
# backend (needs a PostgreSQL running; set DATABASE_URL)
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
# frontend
cd frontend && npm install && npm run dev      # http://localhost:5173
```

## Push to GitHub
```bash
git init
git add .
git commit -m "Banking security monitoring system"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## Security notes
- Change `SECRET_KEY` and all default passwords. Never commit `.env`.
- Put the app behind HTTPS in production.
- Passwords are hashed with bcrypt. Tokens expire after 8 hours.
