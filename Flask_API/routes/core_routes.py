from flask import Blueprint, jsonify


core_bp = Blueprint("core", __name__)


@core_bp.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200


@core_bp.route("/", methods=["GET"])
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
