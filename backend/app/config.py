from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite+aiosqlite:///:memory:"
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_PRIVATE_KEY_PATH: str = "./keys/private.pem"
    JWT_PUBLIC_KEY_PATH: str = "./keys/public.pem"
    JWT_ACCESS_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_EXPIRE_DAYS: int = 30
    OTP_PROVIDER: str = "msg91"
    OTP_PROVIDER_KEY: str = ""
    OTP_EXPIRE_SECONDS: int = 300
    CORS_ORIGINS: str = "*"
    LOG_LEVEL: str = "INFO"
    DEVICE_PROVISIONING_SECRET: str = "sg-dev-device-secret-change-me"


settings = Settings()
