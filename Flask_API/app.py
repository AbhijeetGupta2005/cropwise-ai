from flask import Flask, request, jsonify
from flask_cors import CORS

import os
import json
import time
import logging
import numpy as np
from collections import Counter
import requests
from dotenv import load_dotenv
from joblib import load

# =========================
# INIT
# =========================
app = Flask(__name__)
CORS(app)
app.logger.setLevel(logging.INFO)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# =========================
# LOAD MODELS
# =========================
def load_model(path):
    return load(os.path.join(BASE_DIR, path))

crop_xgb_pipeline = None
crop_rf_pipeline = None
crop_knn_pipeline = None
crop_label_dict = None

fertilizer_xgb_pipeline = None
fertilizer_rf_pipeline = None
fertilizer_svm_pipeline = None
fertilizer_label_dict = None


def ensure_crop_models_loaded():
    global crop_xgb_pipeline, crop_rf_pipeline, crop_knn_pipeline, crop_label_dict

    if all([crop_xgb_pipeline, crop_rf_pipeline, crop_knn_pipeline, crop_label_dict]):
        return

    crop_xgb_pipeline = load_model("models/crop_recommendation/xgb_pipeline.joblib")
    crop_rf_pipeline = load_model("models/crop_recommendation/rf_pipeline.joblib")
    crop_knn_pipeline = load_model("models/crop_recommendation/knn_pipeline.joblib")
    crop_label_dict = load_model("models/crop_recommendation/label_dictionary.joblib")


def ensure_fertilizer_models_loaded():
    global fertilizer_xgb_pipeline, fertilizer_rf_pipeline, fertilizer_svm_pipeline, fertilizer_label_dict

    if all([fertilizer_xgb_pipeline, fertilizer_rf_pipeline, fertilizer_svm_pipeline, fertilizer_label_dict]):
        return

    fertilizer_xgb_pipeline = load_model("models/fertilizer_recommendation/xgb_pipeline.joblib")
    fertilizer_rf_pipeline = load_model("models/fertilizer_recommendation/rf_pipeline.joblib")
    fertilizer_svm_pipeline = load_model("models/fertilizer_recommendation/svm_pipeline.joblib")
    fertilizer_label_dict = load_model("models/fertilizer_recommendation/fertname_dict.joblib")

# =========================
# UTILS
# =========================
def safe_float(value, name):
    try:
        return float(value)
    except Exception:
        raise ValueError(f"Invalid value for '{name}': {value!r}")


def require_json_object(data):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object.")


def get_json_payload():
    data = request.get_json(silent=True)
    require_json_object(data)
    return data


def error_response(message, status_code=400, **extra):
    payload = {"error": message}
    payload.update(extra)
    return jsonify(payload), status_code


def server_error_response():
    return error_response("Internal server error. Please try again later.", 500)


def normalize_language(value):
    language = str(value or "english").strip().lower()
    if language not in {"english", "hindi", "hinglish"}:
        raise ValueError("Unsupported language. Use 'english', 'hindi', or 'hinglish'.")
    return language


def validate_required_fields(data, fields):
    missing = [field for field in fields if field not in data]
    if missing:
        raise ValueError(f"Missing required field(s): {', '.join(missing)}")


def validate_numeric_ranges(data, range_map):
    validated = {}
    for field, (min_value, max_value) in range_map.items():
        value = safe_float(data[field], field)
        if value < min_value or value > max_value:
            raise ValueError(f"'{field}' must be between {min_value} and {max_value}.")
        validated[field] = value
    return validated


def gemini_error_message(status_code, result):
    message = (
        result.get("error", {}).get("message")
        if isinstance(result, dict)
        else None
    )

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
    fallback_models = [
        model.strip()
        for model in fallback_models_env.split(",")
        if model.strip()
    ]

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

            response = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                headers=headers,
                params={"key": api_key},
                json=payload,
                timeout=15,
            )

            try:
                result = response.json()
            except ValueError:
                result = {}

            if response.ok:
                try:
                    text = result["candidates"][0]["content"]["parts"][0]["text"]
                except (KeyError, IndexError, TypeError):
                    app.logger.warning(
                        "Gemini returned an empty or malformed response: model=%s referer=%s payload_keys=%s",
                        model,
                        http_referer or "<missing>",
                        list(result.keys()) if isinstance(result, dict) else type(result).__name__,
                    )
                    return None, ("Gemini returned an empty response. Please try again.", 502)

                return text, None

            status_code = response.status_code
            error_message = result.get("error", {}).get("message") if isinstance(result, dict) else None
            app.logger.warning(
                "Gemini request failed: status=%s model=%s referer=%s model_attempt=%s/%s retry_attempt=%s/%s message=%s",
                status_code,
                model,
                http_referer or "<missing>",
                model_index,
                len(models),
                attempt,
                len(retry_delays),
                error_message,
            )

            last_error = (gemini_error_message(status_code, result), status_code)

            if status_code == 503 and attempt < len(retry_delays):
                app.logger.info(
                    "Retrying Gemini after 503: model=%s referer=%s next_delay=%ss",
                    model,
                    http_referer or "<missing>",
                    retry_delays[attempt],
                )
                continue

            if status_code in {429, 503} and model_index < len(models):
                next_model = models[model_index]
                app.logger.info(
                    "Switching Gemini model after %s: current_model=%s next_model=%s referer=%s",
                    status_code,
                    model,
                    next_model,
                    http_referer or "<missing>",
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


def run_ensemble_prediction(input_data, pipelines, label_lookup, model_keys):
    predictions = [pipeline.predict(input_data)[0] for pipeline in pipelines]
    probabilities = [max(pipeline.predict_proba(input_data)[0]) for pipeline in pipelines]
    labels = [label_lookup[prediction] for prediction in predictions]

    counts = Counter(labels)
    most_common = counts.most_common()
    if most_common[0][1] == 1:
        final_label = labels[probabilities.index(max(probabilities))]
    else:
        final_label = most_common[0][0]

    response = {"final_prediction": final_label}
    for key, label, probability in zip(model_keys, labels, probabilities):
        response[f"{key}_model_prediction"] = label
        response[f"{key}_model_probability"] = round(probability * 100, 2)
    return response



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
- Suggest exactly 3 crop options for a farmer in \"{area}\" during the \"{season}\" season.
- Prefer crops that are common, recognisable, and realistically grown in or around similar Indian conditions.
- Make each reason short, practical, and specific to season, water, soil, or market suitability.
- If a crop is only a moderate match, use \"Medium\" or \"Low\" confidence instead of overstating certainty.
- Avoid repeating near-identical crop choices from the same family unless there is a strong practical reason.

Language rule:
- {get_recommendation_language_instruction(language)}

Return ONLY a raw JSON array of exactly 3 objects.
Each object must have these keys in this exact order:
crop, reason, confidence, season_fit, water_need, soil_type

Allowed values:
- confidence: \"High\", \"Medium\", \"Low\"
- season_fit: \"Perfect\", \"Good\", \"Poor\"
- water_need: \"High\", \"Medium\", \"Low\"

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

# =========================
# CROP PREDICTION
# =========================
def crop_prediction(input_data):
    ensure_crop_models_loaded()
    input_data = np.array(input_data, dtype=np.float64)
    return run_ensemble_prediction(
        input_data,
        [crop_xgb_pipeline, crop_rf_pipeline, crop_knn_pipeline],
        crop_label_dict,
        ["xgb", "rf", "knn"],
    )

# =========================
# FERTILIZER PREDICTION
# =========================
def fertilizer_prediction(input_data):
    ensure_fertilizer_models_loaded()
    input_data = np.array(input_data, dtype=np.float64)
    return run_ensemble_prediction(
        input_data,
        [fertilizer_xgb_pipeline, fertilizer_rf_pipeline, fertilizer_svm_pipeline],
        fertilizer_label_dict,
        ["xgb", "rf", "svm"],
    )

# =========================
# ROUTES
# =========================

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200


@app.route("/", methods=["GET"])
def api_root():
    return jsonify(
        {
            "service": "CropWise AI API",
            "status": "ok",
            "message": "Backend is running. Use the frontend app for the full experience.",
            "endpoints": [
                "/health",
                "/predict_crop",
                "/predict_fertilizer",
                "/ai-recommend",
                "/ai-follow-up",
                "/weather",
            ],
        }
    ), 200

# Crop Prediction
@app.route("/predict_crop", methods=["POST"])
def predict_crop():
    try:
        data = get_json_payload()

        fields = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
        validate_required_fields(data, fields)
        validated = validate_numeric_ranges(data, {
            "N": (0, 140),
            "P": (0, 145),
            "K": (0, 205),
            "temperature": (8, 44),
            "humidity": (14, 100),
            "ph": (0, 14),
            "rainfall": (20, 300),
        })
        input_list = [validated[f] for f in fields]
        input_data = np.array(input_list, dtype=np.float64).reshape(1, -1)

        result = crop_prediction(input_data)
        return jsonify(result)

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception:
        app.logger.exception("Unhandled error in /predict_crop")
        return server_error_response()


# Fertilizer Prediction
@app.route("/predict_fertilizer", methods=["POST"])
def predict_fertilizer():
    try:
        data = get_json_payload()

        required = [
            "Temperature", "Humidity", "Moisture",
            "Soil Type", "Crop Type",
            "Nitrogen", "Potassium", "Phosphorous",
        ]
        validate_required_fields(data, required)
        validated = validate_numeric_ranges(data, {
            "Temperature": (0, 50),
            "Humidity": (0, 100),
            "Moisture": (0, 100),
            "Soil Type": (0, 4),
            "Crop Type": (0, 10),
            "Nitrogen": (0, 140),
            "Potassium": (0, 205),
            "Phosphorous": (0, 140),
        })
        input_list = [validated[f] for f in required]
        input_data = np.array(input_list, dtype=np.float64).reshape(1, -1)

        result = fertilizer_prediction(input_data)
        return jsonify(result)

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception:
        app.logger.exception("Unhandled error in /predict_fertilizer")
        return server_error_response()


@app.route("/ai-recommend", methods=["POST"])
def ai_recommend():
    try:
        data = get_json_payload()

        area = str(data.get("area") or "").strip()
        season = str(data.get("season") or "").strip()
        language = normalize_language(data.get("language", "english"))

        if not area or not season:
            return error_response("Missing 'area' or 'season'", 400)

        prompt = build_ai_recommendation_prompt(area, season, language)

        raw, error = call_gemini(prompt, temperature=0.3)
        if error:
            message, status_code = error
            if should_use_ai_fallback(status_code):
                fallback_items = fallback_ai_recommendations(area, season, language)
                app.logger.warning(
                    "Falling back for /ai-recommend: status=%s area=%s season=%s language=%s message=%s",
                    status_code,
                    area,
                    season,
                    language,
                    message,
                )
                return advisory_response(
                    fallback_items,
                    mode="fallback",
                    source="local-fallback",
                    warning=message,
                )
            return error_response(message, status_code)

        parsed = parse_gemini_json_array(raw)
        normalized_items = [normalize_advisory_item(item, "gemini") for item in parsed[:3]]
        if not normalized_items:
            raise ValueError("Gemini did not return any crop recommendations.")

        return advisory_response(normalized_items, mode="live", source="gemini")

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception:
        app.logger.exception("Unhandled error in /ai-recommend")
        return server_error_response()


@app.route("/ai-follow-up", methods=["POST"])
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

        prompt = build_ai_follow_up_prompt(area, season, crops, conversation, language)

        reply, error = call_gemini(prompt, temperature=0.6)
        if error:
            message, status_code = error
            if should_use_ai_fallback(status_code):
                app.logger.warning(
                    "Falling back for /ai-follow-up: status=%s area=%s season=%s language=%s crops=%s message=%s",
                    status_code,
                    area,
                    season,
                    language,
                    ", ".join(crops),
                    message,
                )
                return follow_up_response(
                    build_follow_up_fallback_reply(area, crops, language),
                    mode="fallback",
                    source="local-fallback",
                    warning=message,
                )
            return error_response(message, status_code)

        return follow_up_response(str(reply).strip(), mode="live", source="gemini")

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception:
        app.logger.exception("Unhandled error in /ai-follow-up")
        return server_error_response()


@app.route("/weather", methods=["GET"])
def weather_lookup():
    city = str(request.args.get("city") or "").strip()
    if not city:
        return error_response("Missing 'city' query parameter.", 400)

    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        return error_response("Weather service is not configured on the backend.", 503)

    try:
        response = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": city, "units": "metric", "appid": api_key},
            timeout=10,
        )
        result = response.json()
    except requests.RequestException:
        app.logger.exception("OpenWeather request failed for city=%s", city)
        return error_response("Weather service is temporarily unavailable.", 502)
    except ValueError:
        app.logger.exception("OpenWeather returned a non-JSON response for city=%s", city)
        return error_response("Weather service returned an invalid response.", 502)

    if response.status_code == 404 or str(result.get("cod")) == "404":
        return error_response("City not found.", 404)

    if not response.ok:
        app.logger.warning(
            "OpenWeather lookup failed: status=%s city=%s message=%s",
            response.status_code,
            city,
            result.get("message"),
        )
        return error_response("Failed to fetch weather data.", 502)

    return jsonify(
        {
            "temperature": result.get("main", {}).get("temp"),
            "humidity": result.get("main", {}).get("humidity"),
            "rainfall": (result.get("rain") or {}).get("1h", 0),
            "source": "openweather",
        }
    )


# =========================
# RUN
# =========================
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=False,
        use_reloader=False,
    )
