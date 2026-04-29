from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/route_manager"
    secret_key: str = "change-me-in-production"
    google_maps_api_key: str = ""
    upload_dir: str = "/app/uploads"
    port: int = 8000
    web_workers: int = 1
    access_token_expire_minutes: int = 480
    algorithm: str = "HS256"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings():
    return Settings()
