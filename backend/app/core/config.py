import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-5.2"
    
    # Configuració per a l'entorn de desenvolupament
    FRONTEND_URL: str = "http://localhost:5173"

    # AFEGEIX AIXÒ:
    STRIPE_SECRET_KEY: str 

    class Config:
        env_file = ".env"
        # Això fa que no importi si al .env està en minúscules o majúscules
        case_sensitive = False 

settings = Settings()