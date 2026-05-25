from flask import jsonify, request


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
    response = jsonify(payload)
    return response, status_code


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
