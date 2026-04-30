"""Shared fixtures. Uses in-memory SQLite so no Postgres is needed.

RATELIMIT_ENABLED and CSRF_ENABLED must be set before the app is imported
so the middleware and slowapi pick them up correctly.
"""
import os

os.environ["RATELIMIT_ENABLED"] = "false"
os.environ["CSRF_ENABLED"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.deps import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.db import Base  # noqa: E402


@pytest.fixture(scope="session")
def engine():
    eng = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=eng)
    return eng


@pytest.fixture()
def client(engine):
    Session = sessionmaker(bind=engine)

    def override_db():
        session = Session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()
