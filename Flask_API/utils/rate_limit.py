import os
import threading
import time
from functools import wraps

from flask import request

from utils.validation import error_response


rate_limit_lock = threading.Lock()
rate_limit_state = {}


def get_env_int(name, default):
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def get_client_ip():
    forwarded_for = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    return forwarded_for or request.remote_addr or "unknown"


def enforce_rate_limit(bucket, limit, window_seconds):
    now = time.time()
    client_ip = get_client_ip()
    key = (bucket, client_ip)

    with rate_limit_lock:
        attempts = [
            timestamp
            for timestamp in rate_limit_state.get(key, [])
            if now - timestamp < window_seconds
        ]
        if len(attempts) >= limit:
            retry_after = max(1, int(window_seconds - (now - attempts[0])))
            response, status_code = error_response(
                "Too many requests. Please wait and try again.",
                429,
                retry_after=retry_after,
            )
            response.headers["Retry-After"] = str(retry_after)
            return response, status_code

        attempts.append(now)
        rate_limit_state[key] = attempts
    return None


def rate_limited(bucket, env_limit_key, default_limit, env_window_key, default_window_seconds):
    def decorator(view_func):
        @wraps(view_func)
        def wrapped(*args, **kwargs):
            limit = get_env_int(env_limit_key, default_limit)
            window_seconds = get_env_int(env_window_key, default_window_seconds)
            if limit > 0 and window_seconds > 0:
                limited_response = enforce_rate_limit(bucket, limit, window_seconds)
                if limited_response:
                    return limited_response
            return view_func(*args, **kwargs)

        return wrapped

    return decorator
