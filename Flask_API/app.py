import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge

from routes.ai_routes import ai_bp
from routes.core_routes import core_bp
from routes.prediction_routes import prediction_bp
from routes.weather_routes import weather_bp
from services.ai_service import call_gemini
from utils.rate_limit import rate_limit_state
from utils.startup import get_allowed_origins, validate_startup_configuration as _validate_startup_configuration
from utils.validation import error_response


app = Flask(__name__)
app.logger.setLevel("INFO")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_REQUEST_BYTES", "16384"))

CORS(
    app,
    resources={r"/*": {"origins": get_allowed_origins()}},
)


@app.errorhandler(RequestEntityTooLarge)
def handle_request_too_large(_error):
    return error_response("Request body is too large.", 413)


def validate_startup_configuration():
    _validate_startup_configuration(app.logger)


validate_startup_configuration()

app.register_blueprint(core_bp)
app.register_blueprint(prediction_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(weather_bp)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=False,
        use_reloader=False,
    )
