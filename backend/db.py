import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://bank:bank@db:5432/bank_security")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()


def now():
    return datetime.now(timezone.utc)


def aware(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def iso(dt):
    return aware(dt).isoformat() if dt else None


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="teller")  # admin | manager | teller
    is_active = Column(Boolean, default=True, nullable=False)
    failed_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now)


class LoginActivity(Base):
    __tablename__ = "login_activity"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True, index=True)
    username = Column(String(50), nullable=False)
    ip_address = Column(String(64), index=True)
    user_agent = Column(String(255))
    success = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now, index=True)


class SecurityLog(Base):
    __tablename__ = "security_logs"
    id = Column(Integer, primary_key=True)
    event_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(10), nullable=False, index=True)  # info | warning | critical
    description = Column(Text, nullable=False)
    actor = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=now, index=True)
