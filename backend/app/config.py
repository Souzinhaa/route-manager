from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional, List


class Settings(BaseSettings):
    database_url: Optional[str] = None
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "route_manager"
    db_host: str = "db"
    db_port: int = 5432
    secret_key: str = "change-me-in-production"
    google_maps_api_key: str = ""
    upload_dir: str = "/app/uploads"
    port: int = 8000
    web_workers: int = 1
    access_token_expire_minutes: int = 480
    algorithm: str = "HS256"

    # Security / limits
    cors_origins: str = "*"
    max_upload_size_mb: int = 20
    max_waypoints: int = 198
    avg_speed_kmh: float = 50.0
    bcrypt_dummy_hash: str = "$2b$12$00000000000000000000000000000000000000000000000000000"

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.cors_origins or self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

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
