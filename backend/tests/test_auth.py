"""Auth endpoint tests (register / login / me / logout)."""


def _register(client, email="test@example.com", password="strongpass1", full_name="Test User"):
    return client.post("/api/auth/register", json={"email": email, "password": password, "full_name": full_name})


def _login(client, email="test@example.com", password="strongpass1"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


# ── register ──────────────────────────────────────────────────────────────────

def test_register_success(client):
    res = _register(client, email="reg1@example.com")
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "reg1@example.com"
    assert data["credits"] == 100.0
    assert "hashed_password" not in data


def test_register_duplicate_email(client):
    _register(client, email="dup@example.com")
    res = _register(client, email="dup@example.com")
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"]


def test_register_weak_password(client):
    res = _register(client, email="weak@example.com", password="short")
    assert res.status_code == 422


def test_register_invalid_email(client):
    res = client.post("/api/auth/register", json={"email": "not-an-email", "password": "strongpass1", "full_name": "X"})
    assert res.status_code == 422


# ── login ─────────────────────────────────────────────────────────────────────

def test_login_success(client):
    _register(client, email="login1@example.com")
    res = _login(client, email="login1@example.com")
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "login1@example.com"
    # httpOnly cookie must be set
    assert "access_token" in res.cookies
    assert "csrf_token" in res.cookies


def test_login_wrong_password(client):
    _register(client, email="badpw@example.com")
    res = _login(client, email="badpw@example.com", password="wrongpass")
    assert res.status_code == 401


def test_login_unknown_email(client):
    res = _login(client, email="nobody@example.com")
    assert res.status_code == 401


# ── /me ───────────────────────────────────────────────────────────────────────

def test_me_authenticated(client):
    _register(client, email="me@example.com")
    _login(client, email="me@example.com")  # sets cookie on client session
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json()["email"] == "me@example.com"


def test_me_unauthenticated(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


# ── logout ────────────────────────────────────────────────────────────────────

def test_logout_clears_cookie(client):
    _register(client, email="logout@example.com")
    _login(client, email="logout@example.com")
    res = client.post("/api/auth/logout")
    assert res.status_code == 204
    # After logout, /me should fail
    res2 = client.get("/api/auth/me")
    assert res2.status_code == 401
