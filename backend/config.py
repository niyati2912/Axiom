import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME = "Axiom"
    APP_VERSION = "2.0.0"
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
    EVENT_GENERATION_INTERVAL = float(os.getenv("EVENT_INTERVAL", "2.0"))
    INTENT_RECALC_INTERVAL = float(os.getenv("INTENT_INTERVAL", "5.0"))
    MARKET_CHECK_INTERVAL = float(os.getenv("MARKET_INTERVAL", "10.0"))
    OPPORTUNITY_CHECK_INTERVAL = float(os.getenv("OPP_INTERVAL", "8.0"))

settings = Settings()