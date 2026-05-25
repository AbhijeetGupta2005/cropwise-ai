import os


def get_allowed_origins():
    configured = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
    if configured:
        return [origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip()]

    defaults = {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }
    frontend_origin = os.getenv("GEMINI_HTTP_REFERER", "").strip().rstrip("/")
    if frontend_origin:
        defaults.add(frontend_origin)
    return sorted(defaults)


def validate_startup_configuration(logger):
    required = {
        "GEMINI_API_KEY": "AI advisor live mode",
        "OPENWEATHER_API_KEY": "weather autofill",
    }
    optional = {
        "GEMINI_HTTP_REFERER": "Gemini referer allowlisting",
        "CORS_ALLOWED_ORIGINS": "production CORS allowlist",
    }

    for key, purpose in required.items():
        if not os.getenv(key, "").strip():
            logger.warning("Missing %s: %s will be unavailable or degraded.", key, purpose)

    for key, purpose in optional.items():
        if not os.getenv(key, "").strip():
            logger.info("Missing %s: using fallback/default behavior for %s.", key, purpose)
