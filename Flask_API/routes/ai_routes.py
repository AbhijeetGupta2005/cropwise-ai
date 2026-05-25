from flask import Blueprint, current_app
from werkzeug.exceptions import RequestEntityTooLarge

from services import ai_service
from utils.rate_limit import rate_limited
from utils.validation import (
    error_response,
    get_json_payload,
    normalize_language,
    server_error_response,
)


ai_bp = Blueprint("ai", __name__)


@ai_bp.route("/ai-recommend", methods=["POST"])
@rate_limited("ai_recommend", "RATE_LIMIT_AI_RECOMMEND", 10, "RATE_LIMIT_WINDOW_SECONDS", 60)
def ai_recommend():
    try:
        data = get_json_payload()

        area = str(data.get("area") or "").strip()
        season = str(data.get("season") or "").strip()
        language = normalize_language(data.get("language", "english"))

        if not area or not season:
            return error_response("Missing 'area' or 'season'", 400)

        prompt = ai_service.build_ai_recommendation_prompt(area, season, language)

        raw, error = ai_service.call_gemini(prompt, temperature=0.3)
        if error:
            message, status_code = error
            if ai_service.should_use_ai_fallback(status_code):
                fallback_items = ai_service.fallback_ai_recommendations(area, season, language)
                current_app.logger.warning(
                    "Falling back for /ai-recommend: status=%s area=%s season=%s language=%s message=%s",
                    status_code,
                    area,
                    season,
                    language,
                    message,
                )
                return ai_service.advisory_response(
                    fallback_items,
                    mode="fallback",
                    source="local-fallback",
                    warning=message,
                )
            return error_response(message, status_code)

        parsed = ai_service.parse_gemini_json_array(raw)
        normalized_items = [ai_service.normalize_advisory_item(item, "gemini") for item in parsed[:3]]
        if not normalized_items:
            raise ValueError("Gemini did not return any crop recommendations.")

        return ai_service.advisory_response(normalized_items, mode="live", source="gemini")

    except RequestEntityTooLarge:
        raise
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception:
        current_app.logger.exception("Unhandled error in /ai-recommend")
        return server_error_response()


@ai_bp.route("/ai-follow-up", methods=["POST"])
@rate_limited("ai_follow_up", "RATE_LIMIT_AI_FOLLOW_UP", 20, "RATE_LIMIT_WINDOW_SECONDS", 60)
def ai_follow_up():
    try:
        data = get_json_payload()
        context = data.get("context") or {}
        history = data.get("history") or []
        language = normalize_language(data.get("language", "english"))

        if not isinstance(context, dict):
            raise ValueError("'context' must be a JSON object.")
        if not isinstance(history, list):
            raise ValueError("'history' must be an array.")

        area = str(context.get("area") or "").strip()
        season = str(context.get("season") or "").strip()
        crops = context.get("crops") or []

        if not isinstance(crops, list):
            raise ValueError("'context.crops' must be an array.")
        crops = [str(crop).strip() for crop in crops if str(crop).strip()]

        if not area or not season or not crops:
            return error_response("Missing AI crop context.", 400)

        conversation = "\n".join(
            f"{'Farmer' if msg.get('role') == 'user' else 'Assistant'}: {msg.get('content', '')}"
            for msg in history
        )

        prompt = ai_service.build_ai_follow_up_prompt(area, season, crops, conversation, language)

        reply, error = ai_service.call_gemini(prompt, temperature=0.6)
        if error:
            message, status_code = error
            if ai_service.should_use_ai_fallback(status_code):
                current_app.logger.warning(
                    "Falling back for /ai-follow-up: status=%s area=%s season=%s language=%s crops=%s message=%s",
                    status_code,
                    area,
                    season,
                    language,
                    ", ".join(crops),
                    message,
                )
                return ai_service.follow_up_response(
                    ai_service.build_follow_up_fallback_reply(area, crops, language),
                    mode="fallback",
                    source="local-fallback",
                    warning=message,
                )
            return error_response(message, status_code)

        return ai_service.follow_up_response(str(reply).strip(), mode="live", source="gemini")

    except RequestEntityTooLarge:
        raise
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception:
        current_app.logger.exception("Unhandled error in /ai-follow-up")
        return server_error_response()
