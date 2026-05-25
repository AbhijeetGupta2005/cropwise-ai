from flask import Blueprint, jsonify, request

from services import weather_service
from utils.rate_limit import rate_limited
from utils.validation import error_response


weather_bp = Blueprint("weather", __name__)


@weather_bp.route("/weather", methods=["GET"])
@rate_limited("weather", "RATE_LIMIT_WEATHER", 20, "RATE_LIMIT_WINDOW_SECONDS", 60)
def weather_lookup():
    city = str(request.args.get("city") or "").strip()
    if not city:
        return error_response("Missing 'city' query parameter.", 400)

    try:
        return jsonify(weather_service.fetch_weather(city))
    except RuntimeError as exc:
        return error_response(str(exc), 503)
    except LookupError as exc:
        return error_response(str(exc), 404)
    except ValueError as exc:
        return error_response(str(exc), 502)
    except ConnectionError as exc:
        return error_response(str(exc), 502)
