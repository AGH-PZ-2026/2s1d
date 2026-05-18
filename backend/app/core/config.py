from pydantic_settings import BaseSettings
from pathlib import Path
BASE_DIR = Path(__file__).parents[3]

class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int
    
    SECRET_KEY: str
    DEBUG: bool = False
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        
    model_config = {"env_file": BASE_DIR / ".env", "extra": "ignore"}
    
settings = Settings()
