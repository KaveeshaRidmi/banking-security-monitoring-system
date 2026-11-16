import os
import time
from datetime import timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from db import Base, engine, SessionLocal, User, LoginActivity, SecurityLog, now, aware, iso
from auth import get_db, hash_password, verify_password, create_token, current_user, require_roles

MAX_FAILED = int(os.getenv("MAX_FAILED_ATTEMPTS", "5"))
LOCK_MINUTES = int(os.getenv("LOCK_MINUTES", "15"))
ROLES = {"admin", "manager", "teller"}

app = FastAPI(title="Banking Security Monitoring API")


# ---------- startup ----------
@app.on_event("startup")
def startup():
    for _ in range(30):  # wait for database
        try:
            Base.metadata.create_all(engine)
            break
        except Exception:
            time.sleep(2)
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            admin_user = os.getenv("ADMIN_USERNAME", "admin")
            admin_pw = os.getenv("ADMIN_PASSWORD", "Admin@12345")
            db.add(User(username=admin_user, full_name="System Administrator",
                        password_hash=hash_password(admin_pw), role="admin"))
            if os.getenv("SEED_DEMO", "true").lower() == "true":
                db.add(User(username="manager1", full_name="Nimali Perera",
                            password_hash=hash_password("Manager@123"), role="manager"))
                db.add(User(username="teller1", full_name="Kasun Fernando",
                            password_hash=hash_password("Teller@123"), role="teller"))
            db.commit()
    finally:
        db.close()


# ---------- helpers ----------
def log_event(db, event_type, severity, description, actor=None):
    db.add(SecurityLog(event_type=event_type, severity=severity, description=description, actor=actor))


def client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    return xff.split(",")[0].strip() if xff else (request.client.host if request.client else "unknown")


def user_out(u: User):
    return {"id": u.id, "username": u.username, "full_name": u.full_name, "role": u.role,
            "is_active": u.is_active, "failed_attempts": u.failed_attempts,
            "locked": bool(u.locked_until and aware(u.locked_until) > now()),
            "locked_until": iso(u.locked_until), "created_at": iso(u.created_at)}


def activity_out(a: LoginActivity):
    return {"id": a.id, "username": a.username, "ip_address": a.ip_address, "user_agent": a.user_agent,
            "success": a.success, "created_at": iso(a.created_at)}


def log_out(l: SecurityLog):
    return {"id": l.id, "event_type": l.event_type, "severity": l.severity,
            "description": l.description, "actor": l.actor, "created_at": iso(l.created_at)}


# ---------- auth ----------
class LoginIn(BaseModel):
    username: str
    password: str


@app.post("/api/auth/login")
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    ua = request.headers.get("user-agent", "")[:255]
    user = db.query(User).filter(User.username == data.username).first()

    def record(success):
        db.add(LoginActivity(user_id=user.id if user else None, username=data.username[:50],
                             ip_address=ip, user_agent=ua, success=success))
        db.flush()

    if user and user.locked_until and aware(user.locked_until) > now():
        record(False)
        log_event(db, "login_blocked", "warning", f"Login attempt on locked account '{user.username}' from {ip}", user.username)
        db.commit()
        raise HTTPException(423, "Account is locked. Try again later or ask an administrator to unlock it.")

    if not user or not user.is_active or not verify_password(data.password, user.password_hash):
        record(False)
        log_event(db, "login_failed", "warning", f"Failed login for '{data.username}' from {ip}", data.username)
        if user:
            user.failed_attempts += 1
            if user.failed_attempts >= MAX_FAILED:
                user.locked_until = now() + timedelta(minutes=LOCK_MINUTES)
                log_event(db, "account_locked", "critical",
                          f"Account '{user.username}' locked for {LOCK_MINUTES} min after {user.failed_attempts} failed attempts", user.username)
        recent = db.query(func.count(LoginActivity.id)).filter(
            LoginActivity.ip_address == ip, LoginActivity.success == False,  # noqa: E712
            LoginActivity.created_at >= now() - timedelta(minutes=10)).scalar()
        if recent == 10:
            log_event(db, "brute_force_suspected", "critical", f"10 failed logins from {ip} within 10 minutes", None)
        db.commit()
        raise HTTPException(401, "Wrong username or password")

    # success
    previous = db.query(LoginActivity).filter(LoginActivity.user_id == user.id, LoginActivity.success == True).all()  # noqa: E712
    if previous and ip not in {p.ip_address for p in previous}:
        log_event(db, "new_ip_login", "warning", f"'{user.username}' signed in from a new IP address: {ip}", user.username)
    record(True)
    user.failed_attempts = 0
    user.locked_until = None
    log_event(db, "login_success", "info", f"'{user.username}' signed in from {ip}", user.username)
    db.commit()
    return {"access_token": create_token(user), "user": user_out(user)}


@app.get("/api/auth/me")
def me(user: User = Depends(current_user)):
    return user_out(user)


@app.get("/api/me/activity")
def my_activity(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(LoginActivity).filter(LoginActivity.user_id == user.id).order_by(LoginActivity.id.desc()).limit(20).all()
    return [activity_out(r) for r in rows]


# ---------- monitoring (admin, manager) ----------
monitor = require_roles("admin", "manager")


@app.get("/api/dashboard")
def dashboard(_: User = Depends(monitor), db: Session = Depends(get_db)):
    since = now() - timedelta(hours=24)
    acts = db.query(LoginActivity).filter(LoginActivity.created_at >= since).all()
    hours = {}
    base = now().replace(minute=0, second=0, microsecond=0)
    for i in range(23, -1, -1):
        hours[base - timedelta(hours=i)] = {"success": 0, "failed": 0}
    for a in acts:
        key = aware(a.created_at).replace(minute=0, second=0, microsecond=0)
        if key in hours:
            hours[key]["success" if a.success else "failed"] += 1
    locked = [u for u in db.query(User).all() if u.locked_until and aware(u.locked_until) > now()]
    alerts = db.query(SecurityLog).filter(SecurityLog.severity.in_(["warning", "critical"])).order_by(SecurityLog.id.desc()).limit(8).all()
    return {
        "total_users": db.query(User).count(),
        "success_24h": sum(1 for a in acts if a.success),
        "failed_24h": sum(1 for a in acts if not a.success),
        "locked_accounts": len(locked),
        "critical_24h": db.query(SecurityLog).filter(SecurityLog.severity == "critical", SecurityLog.created_at >= since).count(),
        "hourly": [{"hour": iso(k), **v} for k, v in hours.items()],
        "alerts": [log_out(a) for a in alerts],
    }


@app.get("/api/activity")
def activity(status: Optional[str] = None, username: Optional[str] = None, limit: int = 100,
             _: User = Depends(monitor), db: Session = Depends(get_db)):
    q = db.query(LoginActivity)
    if status == "success":
        q = q.filter(LoginActivity.success == True)  # noqa: E712
    elif status == "failed":
        q = q.filter(LoginActivity.success == False)  # noqa: E712
    if username:
        q = q.filter(LoginActivity.username.ilike(f"%{username}%"))
    return [activity_out(a) for a in q.order_by(LoginActivity.id.desc()).limit(min(limit, 500)).all()]


@app.get("/api/logs")
def logs(severity: Optional[str] = None, event_type: Optional[str] = None, limit: int = 100,
         _: User = Depends(monitor), db: Session = Depends(get_db)):
    q = db.query(SecurityLog)
    if severity:
        q = q.filter(SecurityLog.severity == severity)
    if event_type:
        q = q.filter(SecurityLog.event_type == event_type)
    return [log_out(l) for l in q.order_by(SecurityLog.id.desc()).limit(min(limit, 500)).all()]


# ---------- user access management (admin) ----------
admin_only = require_roles("admin")


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    full_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=72)
    role: str = "teller"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


@app.get("/api/users")
def list_users(_: User = Depends(admin_only), db: Session = Depends(get_db)):
    return [user_out(u) for u in db.query(User).order_by(User.id).all()]


@app.post("/api/users", status_code=201)
def create_user(data: UserCreate, admin: User = Depends(admin_only), db: Session = Depends(get_db)):
    if data.role not in ROLES:
        raise HTTPException(400, "Role must be admin, manager or teller")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(409, "Username already exists")
    u = User(username=data.username, full_name=data.full_name, password_hash=hash_password(data.password), role=data.role)
    db.add(u)
    log_event(db, "user_created", "info", f"'{admin.username}' created user '{data.username}' with role {data.role}", admin.username)
    db.commit()
    return user_out(u)


@app.patch("/api/users/{user_id}")
def update_user(user_id: int, data: UserUpdate, admin: User = Depends(admin_only), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    if u.id == admin.id and (data.role not in (None, "admin") or data.is_active is False):
        raise HTTPException(400, "You cannot demote or deactivate your own account")
    if data.role is not None:
        if data.role not in ROLES:
            raise HTTPException(400, "Role must be admin, manager or teller")
        if data.role != u.role:
            log_event(db, "role_changed", "warning", f"'{admin.username}' changed '{u.username}' from {u.role} to {data.role}", admin.username)
            u.role = data.role
    if data.is_active is not None and data.is_active != u.is_active:
        u.is_active = data.is_active
        log_event(db, "user_activated" if data.is_active else "user_deactivated", "warning",
                  f"'{admin.username}' {'activated' if data.is_active else 'deactivated'} '{u.username}'", admin.username)
    if data.full_name:
        u.full_name = data.full_name
    db.commit()
    return user_out(u)


@app.post("/api/users/{user_id}/unlock")
def unlock_user(user_id: int, admin: User = Depends(admin_only), db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "User not found")
    u.locked_until = None
    u.failed_attempts = 0
    log_event(db, "account_unlocked", "info", f"'{admin.username}' unlocked '{u.username}'", admin.username)
    db.commit()
    return user_out(u)
