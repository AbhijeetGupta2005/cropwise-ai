import numpy as np
from flask import Blueprint, jsonify
from werkzeug.exceptions import RequestEntityTooLarge

from services import model_service
from utils.rate_limit import rate_limited
from utils.validation import (
    error_response,
    get_json_payload,
    server_error_response,
    validate_numeric_ranges,
    validate_required_fields,
)


prediction_bp = Blueprint("prediction", __name__)


@prediction_bp.route("/predict_crop", methods=["POST"])
@rate_limited("predict_crop", "RATE_LIMIT_PREDICT_CROP", 30, "RATE_LIMIT_WINDOW_SECONDS", 60)
def predict_crop():
    try:
        data = get_json_payload()

        fields = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
        validate_required_fields(data, fields)
        validated = validate_numeric_ranges(
            data,
            {
                "N": (0, 140),
                "P": (0, 145),
                "K": (0, 205),
                "temperature": (8, 44),
                "humidity": (14, 100),
                "ph": (0, 14),
                "rainfall": (20, 300),
            },
        )
        input_list = [validated[f] for f in fields]
        input_data = np.array(input_list, dtype=np.float64).reshape(1, -1)

        result = model_service.crop_prediction(input_data)
        return jsonify(result)

    except RequestEntityTooLarge:
        raise
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception:
        from flask import current_app

        current_app.logger.exception("Unhandled error in /predict_crop")
        return server_error_response()


@prediction_bp.route("/predict_fertilizer", methods=["POST"])
@rate_limited("predict_fertilizer", "RATE_LIMIT_PREDICT_FERTILIZER", 30, "RATE_LIMIT_WINDOW_SECONDS", 60)
def predict_fertilizer():
    try:
        data = get_json_payload()

        required = [
            "Temperature",
            "Humidity",
            "Moisture",
            "Soil Type",
            "Crop Type",
            "Nitrogen",
            "Potassium",
            "Phosphorous",
        ]
        validate_required_fields(data, required)
        validated = validate_numeric_ranges(
            data,
            {
                "Temperature": (0, 50),
                "Humidity": (0, 100),
                "Moisture": (0, 100),
                "Soil Type": (0, 4),
                "Crop Type": (0, 10),
                "Nitrogen": (0, 140),
                "Potassium": (0, 205),
                "Phosphorous": (0, 140),
            },
        )
        input_list = [validated[f] for f in required]
        input_data = np.array(input_list, dtype=np.float64).reshape(1, -1)

        result = model_service.fertilizer_prediction(input_data)
        return jsonify(result)

    except RequestEntityTooLarge:
        raise
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception:
        from flask import current_app

        current_app.logger.exception("Unhandled error in /predict_fertilizer")
        return server_error_response()
