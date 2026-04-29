from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    database_url: Optional[str] = None
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "route_manager"
    db_host: str = "host.docker.internal"
    db_port: int = 5442
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

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.db_host}:{self.db_port}/{self.postgres_db}"
        )


@lru_cache()
def get_settings():
    return Settings()
