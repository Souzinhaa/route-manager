from sqlalchemy import create_engine, Column, Integer, String, DateTime, Date, Float, Boolean, JSON, Enum, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import enum

Base = declarative_base()


class PlanType(str, enum.Enum):
    TESTER = "tester"
    BASIC = "basic"
    STARTER = "starter"
    DELIVERY = "delivery"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class PlanStatus(str, enum.Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PENDING = "pending"
    CANCELLED = "cancelled"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    credits = Column(Float, default=0.0)
    asaas_customer_id = Column(String, nullable=True)
    plan = Column(String, default=PlanType.TESTER)
    subscription_id = Column(String, nullable=True)
    plan_status = Column(String, default=PlanStatus.TRIAL)
    trial_expires_at = Column(DateTime, nullable=True)
    is_admin = Column(Boolean, default=False)


class RouteOptimizationType(str, enum.Enum):
    TSP = "tsp"
    VRP = "vrp"


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    name = Column(String)
    optimization_type = Column(Enum(RouteOptimizationType), default=RouteOptimizationType.TSP)
    start_address = Column(String)
    end_address = Column(String)
    waypoints = Column(JSON)
    optimized_waypoints = Column(JSON)
    google_maps_url = Column(String, nullable=True)
    total_distance_km = Column(Float, nullable=True)
    total_duration_minutes = Column(Float, nullable=True)
    cost_estimate = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    filename = Column(String)
    file_path = Column(String)
    file_type = Column(String)
    extracted_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    amount = Column(Float)
    credits_purchased = Column(Float)
    transaction_id = Column(String, unique=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)


class DailyUsage(Base):
    __tablename__ = "daily_usage"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_user_date"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    date = Column(Date, nullable=False)
    routes_used = Column(Integer, default=0)


def get_db_url(settings):
    return settings.resolved_database_url


def get_engine(settings):
    return create_engine(
        get_db_url(settings),
        pool_pre_ping=True,
        pool_size=3,
        max_overflow=2,
        pool_recycle=3600,  # Recycle connections every hour (Neon disconnects idle)
    )


def get_session_local(engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)
