import json
import os
import time

import requests
from flask import current_app, jsonify


def gemini_error_message(status_code, result):
    message = result.get("error", {}).get("message") if isinstance(result, dict) else None

    if status_code == 429:
        return "Gemini quota or rate limit reached. Please wait and try again, or use a different API key/billing quota."
    if status_code == 403:
        detail = f" Google says: {message}" if message else ""
        return f"Gemini API access is denied. Check that your backend GEMINI_API_KEY is valid, unrestricted for server use, and allowed to use this model.{detail}"
    if status_code == 400:
        return message or "Gemini rejected the request. Check the selected model and request format."

    return message or "Gemini service is unavailable right now. Please try again later."


def should_use_ai_fallback(status_code):
    return status_code in {403, 429, 500, 502, 503, 504}


def get_gemini_models():
    primary_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    fallback_models_env = os.getenv("GEMINI_FALLBACK_MODELS", "").strip()
    fallback_models = [model.strip() for model in fallback_models_env.split(",") if model.strip()]

    models = []
    for model in [primary_model, *fallback_models]:
        if model and model not in models:
            models.append(model)
    return models


def call_gemini(prompt, temperature=0.4):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None, ("Missing GEMINI_API_KEY in the Flask backend environment.", 500)

    models = get_gemini_models()
    headers = {"Content-Type": "application/json"}
    http_referer = os.getenv("GEMINI_HTTP_REFERER")
    if http_referer:
        headers["Referer"] = http_referer

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature},
    }

    retry_delays = [0, 1.0, 2.0]
    last_error = ("Gemini service is unavailable right now. Please try again later.", 503)

    for model_index, model in enumerate(models, start=1):
        response = None
        result = {}

        for attempt, delay in enumerate(retry_delays, start=1):
            if delay:
                time.sleep(delay)

            try:
                response = requests.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    headers=headers,
                    params={"key": api_key},
                    json=payload,
                    timeout=15,
                )
            except requests.RequestException as exc:
                current_app.logger.warning(
                    "Gemini request transport failure: model=%s model_attempt=%s/%s retry_attempt=%s/%s error=%s",
                    model,
                    model_index,
                    len(models),
                    attempt,
                    len(retry_delays),
                    exc,
                )
                last_error = ("Gemini service is unavailable right now. Please try again later.", 503)
                if model_index < len(models):
                    break
                return None, last_error

            try:
                result = response.json()
            except ValueError:
                result = {}

            if response.ok:
                try:
                    text = result["candidates"][0]["content"]["parts"][0]["text"]
                except (KeyError, IndexError, TypeError):
                    current_app.logger.warning(
                        "Gemini returned an empty or malformed response: model=%s payload_keys=%s",
                        model,
                        list(result.keys()) if isinstance(result, dict) else type(result).__name__,
                    )
                    return None, ("Gemini returned an empty response. Please try again.", 502)

                return text, None

            status_code = response.status_code
            error_message = result.get("error", {}).get("message") if isinstance(result, dict) else None
            current_app.logger.warning(
                "Gemini request failed: status=%s model=%s model_attempt=%s/%s retry_attempt=%s/%s message=%s",
                status_code,
                model,
                model_index,
                len(models),
                attempt,
                len(retry_delays),
                error_message,
            )

            last_error = (gemini_error_message(status_code, result), status_code)

            if status_code == 503 and attempt < len(retry_delays):
                current_app.logger.info(
                    "Retrying Gemini after 503: model=%s next_delay=%ss",
                    model,
                    retry_delays[attempt],
                )
                continue

            if status_code in {429, 503} and model_index < len(models):
                next_model = models[model_index]
                current_app.logger.info(
                    "Switching Gemini model after %s: current_model=%s next_model=%s",
                    status_code,
                    model,
                    next_model,
                )
                break

            return None, last_error

    return None, last_error


def parse_gemini_json_array(text):
    raw = text.replace("```json", "").replace("```", "").strip()
    if not raw:
        raise ValueError("Gemini returned an empty response.")

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("[")
        end = raw.rfind("]")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("Gemini response did not contain a valid JSON array.")
        parsed = json.loads(raw[start : end + 1])
    if not isinstance(parsed, list):
        raise ValueError("Gemini response was not a JSON array.")
    return parsed


def normalize_scale(value, allowed_values, default):
    normalized = str(value or "").strip().lower()
    for candidate in allowed_values:
        if normalized == candidate.lower():
            return candidate
    return default


def normalize_advisory_item(item, default_source="gemini"):
    if not isinstance(item, dict):
        raise ValueError("Each advisory item must be a JSON object.")

    crop = str(item.get("crop") or "").strip()
    if not crop:
        raise ValueError("Each advisory item must include a crop name.")

    reason = str(item.get("reason") or "").strip() or "No explanation was returned."
    confidence = normalize_scale(item.get("confidence"), ["High", "Medium", "Low"], "Medium")
    season_fit = normalize_scale(item.get("season_fit"), ["Perfect", "Good", "Poor"], "Good")
    water_need = normalize_scale(item.get("water_need"), ["High", "Medium", "Low"], "Medium")
    soil_type = str(item.get("soil_type") or "General agricultural soil").strip()
    source = str(item.get("source") or default_source).strip().lower()

    return {
        "crop": crop,
        "reason": reason,
        "confidence": confidence,
        "season_fit": season_fit,
        "water_need": water_need,
        "soil_type": soil_type,
        "source": source,
    }


def advisory_response(items, mode, source, warning=None):
    payload = {
        "items": items,
        "meta": {
            "mode": mode,
            "source": source,
        },
    }
    if warning:
        payload["meta"]["warning"] = warning
        payload["meta"]["warning_code"] = "live_service_unavailable"
    return jsonify(payload)


def follow_up_response(reply, mode, source, warning=None):
    payload = {
        "reply": reply,
        "meta": {
            "mode": mode,
            "source": source,
        },
    }
    if warning:
        payload["meta"]["warning"] = warning
        payload["meta"]["warning_code"] = "live_service_unavailable"
    return jsonify(payload)


def soften_fallback_reason_text(reason, language):
    text = str(reason or "").strip()
    if not text:
        return text

    if language == "english":
        replacements = {
            "Rule-based fallback for this region: ": "Fallback guidance for this region: ",
            "Rule-based fallback for Assam: ": "Fallback guidance for Assam: ",
            "Rule-based fallback for the Cauvery Delta: ": "Fallback guidance for the Cauvery Delta: ",
            "Rule-based fallback: ": "Fallback guidance: ",
        }
        for old, new in replacements.items():
            if text.startswith(old):
                return text.replace(old, new, 1)

    return text


def get_recommendation_language_instruction(language):
    if language == "hindi":
        return (
            "Write only the reason values in Hindi. Keep crop names, JSON keys, confidence, "
            "season_fit, water_need, and soil_type values in English."
        )
    if language == "hinglish":
        return (
            "Write only the reason values in Hinglish using Hindi words written in English letters. "
            "Keep crop names, JSON keys, confidence, season_fit, water_need, and soil_type values in English."
        )
    return "Write all values in simple English."


def build_ai_recommendation_prompt(area, season, language):
    return f"""
You are an expert agricultural advisor specialising in practical Indian farming recommendations.

Task:
- Suggest exactly 3 crop options for a farmer in "{area}" during the "{season}" season.
- Prefer crops that are common, recognisable, and realistically grown in or around similar Indian conditions.
- Make each reason short, practical, and specific to season, water, soil, or market suitability.
- If a crop is only a moderate match, use "Medium" or "Low" confidence instead of overstating certainty.
- Avoid repeating near-identical crop choices from the same family unless there is a strong practical reason.

Language rule:
- {get_recommendation_language_instruction(language)}

Return ONLY a raw JSON array of exactly 3 objects.
Each object must have these keys in this exact order:
crop, reason, confidence, season_fit, water_need, soil_type

Allowed values:
- confidence: "High", "Medium", "Low"
- season_fit: "Perfect", "Good", "Poor"
- water_need: "High", "Medium", "Low"

Output rules:
- No markdown
- No explanation outside the JSON array
- No extra keys
- Keep each reason within 1 to 2 short sentences
""".strip()


def build_ai_follow_up_prompt(area, season, crops, conversation, language):
    if language == "hindi":
        language_instruction = "Answer in Hindi."
    elif language == "hinglish":
        language_instruction = "Answer in Hinglish using Hindi words written in English letters."
    else:
        language_instruction = "Answer in simple English."

    return f"""
You are an expert agricultural advisor helping an Indian farmer with a follow-up question.

Context:
- Location: {area}
- Season: {season}
- Recommended crops already shown: {", ".join(crops)}

Conversation so far:
{conversation or "No prior conversation."}

Instructions:
- {language_instruction}
- Stay grounded in the listed crops, the region, and the season.
- Be practical and farmer-friendly.
- If there is uncertainty, clearly say what the farmer should verify locally.
- Prefer short bullet points when they improve clarity.
- Keep the response under 120 words.
- Do not return JSON.
- Do not use markdown tables.
""".strip()


def build_follow_up_fallback_reply(area, crops, language):
    crops_text = ", ".join(crops)

    if language == "hindi":
        return (
            f"Live AI follow-up abhi temporary roop se unavailable hai. फिलहाल {area} ke liye {crops_text} ko "
            "paani ki zarurat, mitti ki suitability, beej ki uplabdhata aur local mandi demand ke hisaab se compare karein. "
            "Bowaai se pehle local agriculture officer ya trusted agri expert se confirm kar lein."
        )

    if language == "hinglish":
        return (
            f"Live AI follow-up abhi temporarily unavailable hai. Filhal {area} ke liye {crops_text} ko "
            "water need, soil fit, seed availability aur local mandi demand ke hisaab se compare karein. "
            "Bowaai se pehle local agriculture officer ya trusted agri expert se confirm kar lein."
        )

    return (
        f"Live AI follow-up is temporarily unavailable. For now, compare {crops_text} for {area} using water need, "
        "soil fit, seed availability, and nearby mandi demand. Before planting, confirm the final choice with a local "
        "agriculture officer or a trusted agri expert."
    )


def crop_item(crop, reason, confidence, season_fit, water_need, soil_type):
    return {
        "crop": crop,
        "reason": reason,
        "confidence": confidence,
        "season_fit": season_fit,
        "water_need": water_need,
        "soil_type": soil_type,
        "source": "fallback",
    }


def fallback_reason(crop, area, season, water_need, language):
    water_hindi = {"High": "zyada", "Medium": "madhyam", "Low": "kam"}.get(water_need, water_need)
    water_hinglish = {"High": "zyada", "Medium": "madhyam", "Low": "kam"}.get(water_need, water_need)

    if language == "hindi":
        return (
            f"{area} mein {season} season ke liye {crop} ek upyogi vikalp ho sakta hai. "
            f"Iski paani ki zarurat {water_hindi} hai, isliye bowaai se pehle sinchai, mitti aur local bazaar ko check karein."
        )
    if language == "hinglish":
        return (
            f"{area} me {season} season ke liye {crop} practical option ho sakta hai. "
            f"Iski water need {water_hinglish} hai, isliye irrigation, soil aur local market pehle check karein."
        )
    return None


def fallback_ai_recommendations(area, season, language="english"):
    area_key = (area or "").lower()
    season_key = (season or "").lower()

    generic = {
        "kharif": [
            crop_item("Rice", "Fallback guidance: monsoon rainfall usually supports paddy where water is available.", "Medium", "Good", "High", "Clay loam"),
            crop_item("Maize", "Fallback guidance: maize is a practical Kharif option in well-drained fields.", "Medium", "Good", "Medium", "Loam"),
            crop_item("Cotton", "Fallback guidance: cotton can suit warm Kharif conditions where drainage is reliable.", "Low", "Good", "Medium", "Black soil or loam"),
        ],
        "rabi": [
            crop_item("Wheat", "Fallback guidance: wheat is a common winter crop in many irrigated northern plains.", "Medium", "Good", "Medium", "Loam"),
            crop_item("Chickpea", "Fallback guidance: chickpea suits cooler Rabi weather and needs moderate irrigation.", "Medium", "Good", "Low", "Sandy loam"),
            crop_item("Lentil", "Fallback guidance: lentil is a low-water pulse option for Rabi fields.", "Medium", "Good", "Low", "Loam"),
        ],
        "zaid": [
            crop_item("Mung Bean", "Fallback guidance: short-duration mung bean can fit the summer gap between main seasons.", "Medium", "Good", "Low", "Sandy loam"),
            crop_item("Watermelon", "Fallback guidance: watermelon fits warm Zaid weather when irrigation is available.", "Medium", "Good", "Medium", "Sandy loam"),
            crop_item("Muskmelon", "Fallback guidance: muskmelon is suitable for hot, dry summer windows with managed watering.", "Medium", "Good", "Medium", "Sandy loam"),
        ],
    }

    regional = None
    if any(place in area_key for place in ["punjab", "meerut", "haryana", "western up"]):
        regional = {
            "kharif": [
                crop_item("Rice", "Fallback guidance for this region: irrigated Kharif fields often support paddy.", "High", "Good", "High", "Clay loam"),
                crop_item("Maize", "Fallback guidance for this region: maize is a strong alternative where water is limited.", "Medium", "Good", "Medium", "Loam"),
                crop_item("Cotton", "Fallback guidance for this region: cotton can work in warm, well-drained fields.", "Medium", "Good", "Medium", "Sandy loam"),
            ],
            "rabi": [
                crop_item("Wheat", "Fallback guidance for this region: wheat is the dominant Rabi choice with irrigation.", "High", "Perfect", "Medium", "Loam"),
                crop_item("Mustard", "Fallback guidance for this region: mustard suits cool, dry Rabi conditions.", "Medium", "Good", "Low", "Sandy loam"),
                crop_item("Chickpea", "Fallback guidance for this region: chickpea is useful where lower water use is preferred.", "Medium", "Good", "Low", "Sandy loam"),
            ],
            "zaid": generic["zaid"],
        }
    elif "assam" in area_key:
        regional = {
            "kharif": [
                crop_item("Rice", "Fallback guidance for Assam: humid monsoon conditions strongly support paddy.", "High", "Perfect", "High", "Clay loam"),
                crop_item("Jute", "Fallback guidance for Assam: jute suits warm, humid Kharif conditions.", "Medium", "Good", "High", "Alluvial loam"),
                crop_item("Maize", "Fallback guidance for Assam: maize can fit upland, well-drained fields.", "Medium", "Good", "Medium", "Loam"),
            ],
            "rabi": [
                crop_item("Mustard", "Fallback guidance for Assam: mustard is a common cool-season oilseed option.", "Medium", "Good", "Low", "Loam"),
                crop_item("Potato", "Fallback guidance for Assam: potato can perform well in cool Rabi weather.", "Medium", "Good", "Medium", "Sandy loam"),
                crop_item("Lentil", "Fallback guidance for Assam: lentil is a practical pulse option after rice.", "Medium", "Good", "Low", "Loam"),
            ],
            "zaid": generic["zaid"],
        }
    elif "cauvery" in area_key or "delta" in area_key:
        regional = {
            "kharif": [
                crop_item("Rice", "Fallback guidance for the Cauvery Delta: canal and monsoon water often support paddy.", "High", "Perfect", "High", "Clay loam"),
                crop_item("Blackgram", "Fallback guidance for the Cauvery Delta: blackgram can fit after short-duration paddy.", "Medium", "Good", "Low", "Loam"),
                crop_item("Maize", "Fallback guidance for the Cauvery Delta: maize works where drainage and irrigation are managed.", "Medium", "Good", "Medium", "Loam"),
            ],
            "rabi": [
                crop_item("Rice", "Fallback guidance for the Cauvery Delta: irrigated fields can support another paddy crop.", "Medium", "Good", "High", "Clay loam"),
                crop_item("Blackgram", "Fallback guidance for the Cauvery Delta: blackgram is a useful pulse in rice fallows.", "Medium", "Good", "Low", "Loam"),
                crop_item("Groundnut", "Fallback guidance for the Cauvery Delta: groundnut can suit lighter soils with drainage.", "Medium", "Good", "Medium", "Sandy loam"),
            ],
            "zaid": generic["zaid"],
        }

    choices = [dict(choice) for choice in (regional or generic).get(season_key, generic["kharif"])[:3]]
    if language != "english":
        for choice in choices:
            localized = fallback_reason(choice["crop"], area, season, choice["water_need"], language)
            if localized:
                choice["reason"] = localized
    else:
        for choice in choices:
            choice["reason"] = soften_fallback_reason_text(choice["reason"], language)
    return choices
