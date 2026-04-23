from flask import Flask, request, jsonify
from flask_cors import CORS

import os
import json
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


def call_gemini(prompt, temperature=0.4):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None, ("Missing GEMINI_API_KEY in the Flask backend environment.", 500)

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    headers = {"Content-Type": "application/json"}
    http_referer = os.getenv("GEMINI_HTTP_REFERER")
    if http_referer:
        headers["Referer"] = http_referer

    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        headers=headers,
        params={"key": api_key},
        json={
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature},
        },
        timeout=15,
    )

    try:
        result = response.json()
    except ValueError:
        result = {}

    if not response.ok:
        app.logger.warning(
            "Gemini request failed: status=%s model=%s referer=%s message=%s",
            response.status_code,
            model,
            http_referer or "<missing>",
            result.get("error", {}).get("message") if isinstance(result, dict) else None,
        )
        return None, (gemini_error_message(response.status_code, result), response.status_code)

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


def parse_gemini_json_array(text):
    raw = text.replace("```json", "").replace("```", "").strip()
    parsed = json.loads(raw)
    if not isinstance(parsed, list):
        raise ValueError("Gemini response was not a JSON array.")
    return parsed


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
    water_hindi = {"High": "ज्यादा", "Medium": "मध्यम", "Low": "कम"}.get(water_need, water_need)
    water_hinglish = {"High": "zyada", "Medium": "madhyam", "Low": "kam"}.get(water_need, water_need)

    if language == "hindi":
        return f"{area} में {season} मौसम के लिए {crop} अच्छा विकल्प हो सकता है। इसकी पानी की जरूरत {water_hindi} है, इसलिए बोआई से पहले सिंचाई, मिट्टी और स्थानीय बाजार की जांच करें।"
    if language == "hinglish":
        return f"{area} me {season} season ke liye {crop} practical option ho sakta hai. Iski water need {water_hinglish} hai, isliye irrigation, soil aur local market pehle check karein."
    return None


def fallback_ai_recommendations(area, season, language="english"):
    area_key = (area or "").lower()
    season_key = (season or "").lower()

    generic = {
        "kharif": [
            crop_item("Rice", "Rule-based fallback: monsoon rainfall usually supports paddy where water is available.", "Medium", "Good", "High", "Clay loam"),
            crop_item("Maize", "Rule-based fallback: maize is a practical Kharif option in well-drained fields.", "Medium", "Good", "Medium", "Loam"),
            crop_item("Cotton", "Rule-based fallback: cotton can suit warm Kharif conditions where drainage is reliable.", "Low", "Good", "Medium", "Black soil or loam"),
        ],
        "rabi": [
            crop_item("Wheat", "Rule-based fallback: wheat is a common winter crop in many irrigated northern plains.", "Medium", "Good", "Medium", "Loam"),
            crop_item("Chickpea", "Rule-based fallback: chickpea suits cooler Rabi weather and needs moderate irrigation.", "Medium", "Good", "Low", "Sandy loam"),
            crop_item("Lentil", "Rule-based fallback: lentil is a low-water pulse option for Rabi fields.", "Medium", "Good", "Low", "Loam"),
        ],
        "zaid": [
            crop_item("Mung Bean", "Rule-based fallback: short-duration mung bean can fit the summer gap between main seasons.", "Medium", "Good", "Low", "Sandy loam"),
            crop_item("Watermelon", "Rule-based fallback: watermelon fits warm Zaid weather when irrigation is available.", "Medium", "Good", "Medium", "Sandy loam"),
            crop_item("Muskmelon", "Rule-based fallback: muskmelon is suitable for hot, dry summer windows with managed watering.", "Medium", "Good", "Medium", "Sandy loam"),
        ],
    }

    regional = None
    if any(place in area_key for place in ["punjab", "meerut", "haryana", "western up"]):
        regional = {
            "kharif": [
                crop_item("Rice", "Rule-based fallback for this region: irrigated Kharif fields often support paddy.", "High", "Good", "High", "Clay loam"),
                crop_item("Maize", "Rule-based fallback for this region: maize is a strong alternative where water is limited.", "Medium", "Good", "Medium", "Loam"),
                crop_item("Cotton", "Rule-based fallback for this region: cotton can work in warm, well-drained fields.", "Medium", "Good", "Medium", "Sandy loam"),
            ],
            "rabi": [
                crop_item("Wheat", "Rule-based fallback for this region: wheat is the dominant Rabi choice with irrigation.", "High", "Perfect", "Medium", "Loam"),
                crop_item("Mustard", "Rule-based fallback for this region: mustard suits cool, dry Rabi conditions.", "Medium", "Good", "Low", "Sandy loam"),
                crop_item("Chickpea", "Rule-based fallback for this region: chickpea is useful where lower water use is preferred.", "Medium", "Good", "Low", "Sandy loam"),
            ],
            "zaid": generic["zaid"],
        }
    elif "assam" in area_key:
        regional = {
            "kharif": [
                crop_item("Rice", "Rule-based fallback for Assam: humid monsoon conditions strongly support paddy.", "High", "Perfect", "High", "Clay loam"),
                crop_item("Jute", "Rule-based fallback for Assam: jute suits warm, humid Kharif conditions.", "Medium", "Good", "High", "Alluvial loam"),
                crop_item("Maize", "Rule-based fallback for Assam: maize can fit upland, well-drained fields.", "Medium", "Good", "Medium", "Loam"),
            ],
            "rabi": [
                crop_item("Mustard", "Rule-based fallback for Assam: mustard is a common cool-season oilseed option.", "Medium", "Good", "Low", "Loam"),
                crop_item("Potato", "Rule-based fallback for Assam: potato can perform well in cool Rabi weather.", "Medium", "Good", "Medium", "Sandy loam"),
                crop_item("Lentil", "Rule-based fallback for Assam: lentil is a practical pulse option after rice.", "Medium", "Good", "Low", "Loam"),
            ],
            "zaid": generic["zaid"],
        }
    elif "cauvery" in area_key or "delta" in area_key:
        regional = {
            "kharif": [
                crop_item("Rice", "Rule-based fallback for the Cauvery Delta: canal and monsoon water often support paddy.", "High", "Perfect", "High", "Clay loam"),
                crop_item("Blackgram", "Rule-based fallback for the Cauvery Delta: blackgram can fit after short-duration paddy.", "Medium", "Good", "Low", "Loam"),
                crop_item("Maize", "Rule-based fallback for the Cauvery Delta: maize works where drainage and irrigation are managed.", "Medium", "Good", "Medium", "Loam"),
            ],
            "rabi": [
                crop_item("Rice", "Rule-based fallback for the Cauvery Delta: irrigated fields can support another paddy crop.", "Medium", "Good", "High", "Clay loam"),
                crop_item("Blackgram", "Rule-based fallback for the Cauvery Delta: blackgram is a useful pulse in rice fallows.", "Medium", "Good", "Low", "Loam"),
                crop_item("Groundnut", "Rule-based fallback for the Cauvery Delta: groundnut can suit lighter soils with drainage.", "Medium", "Good", "Medium", "Sandy loam"),
            ],
            "zaid": generic["zaid"],
        }

    choices = [dict(choice) for choice in (regional or generic).get(season_key, generic["kharif"])[:3]]
    if language != "english":
        for choice in choices:
            localized = fallback_reason(choice["crop"], area, season, choice["water_need"], language)
            if localized:
                choice["reason"] = localized
    return choices

# =========================
# CROP PREDICTION
# =========================
def crop_prediction(input_data):
    ensure_crop_models_loaded()
    input_data = np.array(input_data, dtype=np.float64)

    preds = [
        crop_xgb_pipeline.predict(input_data)[0],
        crop_rf_pipeline.predict(input_data)[0],
        crop_knn_pipeline.predict(input_data)[0],
    ]
    probs = [
        max(crop_xgb_pipeline.predict_proba(input_data)[0]),
        max(crop_rf_pipeline.predict_proba(input_data)[0]),
        max(crop_knn_pipeline.predict_proba(input_data)[0]),
    ]
    labels = [crop_label_dict[p] for p in preds]

    count = Counter(labels)
    most_common = count.most_common()
    if most_common[0][1] == 1:
        final = labels[probs.index(max(probs))]
    else:
        final = most_common[0][0]

    return {
        "xgb_model_prediction":  labels[0],
        "rf_model_prediction":   labels[1],
        "knn_model_prediction":  labels[2],
        "xgb_model_probability": round(probs[0] * 100, 2),
        "rf_model_probability":  round(probs[1] * 100, 2),
        "knn_model_probability": round(probs[2] * 100, 2),
        "final_prediction":      final,
    }

# =========================
# FERTILIZER PREDICTION
# =========================
def fertilizer_prediction(input_data):
    ensure_fertilizer_models_loaded()
    input_data = np.array(input_data, dtype=np.float64)

    preds = [
        fertilizer_xgb_pipeline.predict(input_data)[0],
        fertilizer_rf_pipeline.predict(input_data)[0],
        fertilizer_svm_pipeline.predict(input_data)[0],
    ]
    probs = [
        max(fertilizer_xgb_pipeline.predict_proba(input_data)[0]),
        max(fertilizer_rf_pipeline.predict_proba(input_data)[0]),
        max(fertilizer_svm_pipeline.predict_proba(input_data)[0]),
    ]
    labels = [fertilizer_label_dict[p] for p in preds]

    count = Counter(labels)
    most_common = count.most_common()
    if most_common[0][1] == 1:
        final = labels[probs.index(max(probs))]
    else:
        final = most_common[0][0]

    # Return named per-model fields so the frontend can display a proper breakdown
    return {
        "xgb_model_prediction":  labels[0],
        "rf_model_prediction":   labels[1],
        "svm_model_prediction":  labels[2],
        "xgb_model_probability": round(probs[0] * 100, 2),
        "rf_model_probability":  round(probs[1] * 100, 2),
        "svm_model_probability": round(probs[2] * 100, 2),
        "final_prediction":      final,
    }

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
        data = request.get_json()
        print("CROP INPUT:", data)

        fields = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
        require_json_object(data)
        validate_required_fields(data, fields)
        validated = validate_numeric_ranges(data, {
            "N": (0, 140),
            "P": (0, 140),
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
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# Fertilizer Prediction
@app.route("/predict_fertilizer", methods=["POST"])
def predict_fertilizer():
    try:
        data = request.get_json()
        print("FERTILIZER INPUT:", data)
        require_json_object(data)

        # Frontend sends pre-encoded Soil Type and Crop Type as integers
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

        print("INPUT ARRAY:", input_data)

        result = fertilizer_prediction(input_data)
        return jsonify(result)

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# AI Crop Recommendation (Gemini)
@app.route("/ai-recommend", methods=["POST"])
def ai_recommend():
    try:
        data = request.get_json()

        area   = data.get("area")
        season = data.get("season")
        language = data.get("language", "english")

        if not area or not season:
            return jsonify({"error": "Missing 'area' or 'season'"}), 400

        reason_language = "Write reason values in simple English."
        if language == "hindi":
            reason_language = "Write reason values in Hindi. Keep crop names, JSON keys, confidence, season_fit, water_need, and soil_type values in English."
        elif language == "hinglish":
            reason_language = "Write reason values in Hinglish, using Hindi words written in English letters. Keep crop names, JSON keys, confidence, season_fit, water_need, and soil_type values in English."

        prompt = f"""
You are an expert agricultural advisor specialising in Indian farming.

A farmer in "{area}" wants to know which crops to grow during the "{season}" season.

{reason_language}

Return ONLY a raw JSON array of exactly 3 objects with these keys:
crop, reason, confidence, season_fit, water_need, soil_type

confidence values: "High", "Medium", or "Low"
season_fit values: "Perfect", "Good", or "Poor"
water_need values: "High", "Medium", or "Low"
"""

        raw, error = call_gemini(prompt, temperature=0.3)
        if error:
            message, status_code = error
            if should_use_ai_fallback(status_code):
                app.logger.warning(
                    "Falling back for /ai-recommend: status=%s area=%s season=%s language=%s message=%s",
                    status_code,
                    area,
                    season,
                    language,
                    message,
                )
                return jsonify(fallback_ai_recommendations(area, season, language))
            return jsonify({"error": message}), status_code

        parsed = parse_gemini_json_array(raw)

        return jsonify(parsed)

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/ai-follow-up", methods=["POST"])
def ai_follow_up():
    try:
        data = request.get_json()
        context = data.get("context") or {}
        history = data.get("history") or []
        language = data.get("language", "english")

        area = context.get("area")
        season = context.get("season")
        crops = context.get("crops") or []

        if not area or not season or not crops:
            return jsonify({"error": "Missing AI crop context."}), 400

        conversation = "\n".join(
            f"{'Farmer' if msg.get('role') == 'user' else 'Assistant'}: {msg.get('content', '')}"
            for msg in history
        )

        lang_instruction = "Answer in simple English."
        if language == "hindi":
            lang_instruction = "Answer in Hindi."
        elif language == "hinglish":
            lang_instruction = "Answer in Hinglish (Hindi written in English letters)."

        prompt = f"""
You are an expert agricultural advisor.

Context:
- Location: {area}
- Season: {season}
- Crops: {", ".join(crops)}

Conversation:
{conversation}

{lang_instruction}

Rules:
- Be practical and farmer-friendly
- Use bullet points if useful
- Keep response under 150 words
- Do NOT return JSON
"""

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
                crops_text = ", ".join(crops)
                if language == "hindi":
                    return jsonify({
                        "reply": (
                            f"Gemini quota अभी temporarily busy है। {area} के लिए {crops_text} को पानी की जरूरत, "
                            "मिट्टी की suitability, seed availability और mandi demand के हिसाब से compare करें। "
                            "Final decision से पहले local agriculture officer से confirm कर लें।"
                        )
                    })
                if language == "hinglish":
                    return jsonify({
                        "reply": (
                            f"Gemini quota abhi temporarily busy hai. {area} ke liye {crops_text} ko irrigation need, "
                            "soil fit, seed availability aur mandi demand ke hisaab se compare karein. Final decision "
                            "se pehle local agriculture officer se confirm kar lein."
                        )
                    })
                return jsonify({
                    "reply": (
                        f"Live AI follow-up is temporarily unavailable because the Gemini quota is busy. For {area}, "
                        f"compare {crops_text} by irrigation need, soil fit, seed availability, and nearby mandi demand. "
                        "Before planting, confirm the final choice with a local agriculture extension officer."
                    )
                })
            return jsonify({"error": message}), status_code

        return jsonify({"reply": reply})

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


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
