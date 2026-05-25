import os

import requests
from flask import current_app


def fetch_weather(city):
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        raise RuntimeError("Weather service is not configured on the backend.")

    try:
        response = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": city, "units": "metric", "appid": api_key},
            timeout=10,
        )
        result = response.json()
    except requests.RequestException:
        current_app.logger.exception("OpenWeather request failed for city=%s", city)
        raise ConnectionError("Weather service is temporarily unavailable.")
    except ValueError:
        current_app.logger.exception("OpenWeather returned a non-JSON response for city=%s", city)
        raise ValueError("Weather service returned an invalid response.")

    if response.status_code == 404 or str(result.get("cod")) == "404":
        raise LookupError("City not found.")

    if not response.ok:
        current_app.logger.warning(
            "OpenWeather lookup failed: status=%s city=%s message=%s",
            response.status_code,
            city,
            result.get("message"),
        )
        raise ConnectionError("Failed to fetch weather data.")

    return {
        "temperature": result.get("main", {}).get("temp"),
        "humidity": result.get("main", {}).get("humidity"),
        "rainfall": (result.get("rain") or {}).get("1h", 0),
        "source": "openweather",
    }
