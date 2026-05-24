import os
import sys
import unittest
from unittest.mock import MagicMock, patch


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
FLASK_API_DIR = os.path.dirname(CURRENT_DIR)
if FLASK_API_DIR not in sys.path:
    sys.path.insert(0, FLASK_API_DIR)

import app as backend_app


class CropWiseApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        backend_app.app.config["TESTING"] = True
        cls.client = backend_app.app.test_client()

    def test_health_check_returns_ok(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})

    def test_predict_crop_rejects_missing_fields(self):
        response = self.client.post(
            "/predict_crop",
            json={
                "N": 90,
                "P": 42,
                "K": 43,
                "temperature": 26,
                "humidity": 60,
                "ph": 6.5,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Missing required field(s)", response.get_json()["error"])

    def test_predict_fertilizer_rejects_out_of_range_values(self):
        response = self.client.post(
            "/predict_fertilizer",
            json={
                "Temperature": 26,
                "Humidity": 52,
                "Moisture": 38,
                "Soil Type": 2,
                "Crop Type": 10,
                "Nitrogen": 160,
                "Potassium": 40,
                "Phosphorous": 40,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("'Nitrogen' must be between 0 and 140.", response.get_json()["error"])

    @patch("app.call_gemini", return_value=(None, ("Gemini quota busy", 503)))
    def test_ai_recommend_uses_structured_fallback_response(self, _mock_call_gemini):
        response = self.client.post(
            "/ai-recommend",
            json={
                "area": "Punjab",
                "season": "Rabi",
                "language": "english",
            },
        )

        data = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["meta"]["mode"], "fallback")
        self.assertEqual(data["meta"]["source"], "local-fallback")
        self.assertEqual(data["meta"]["warning"], "Gemini quota busy")
        self.assertEqual(data["meta"]["warning_code"], "live_service_unavailable")
        self.assertEqual(len(data["items"]), 3)
        self.assertIn("crop", data["items"][0])
        self.assertEqual(data["items"][0]["source"], "fallback")

    @patch("app.call_gemini", return_value=(None, ("Gemini temporarily unavailable", 503)))
    def test_ai_follow_up_uses_structured_fallback_response(self, _mock_call_gemini):
        response = self.client.post(
            "/ai-follow-up",
            json={
                "language": "english",
                "context": {
                    "area": "Punjab",
                    "season": "Rabi",
                    "crops": ["Wheat", "Mustard"],
                },
                "history": [
                    {"role": "user", "content": "Can I intercrop with wheat?"}
                ],
            },
        )

        data = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["meta"]["mode"], "fallback")
        self.assertEqual(data["meta"]["source"], "local-fallback")
        self.assertEqual(data["meta"]["warning"], "Gemini temporarily unavailable")
        self.assertEqual(data["meta"]["warning_code"], "live_service_unavailable")
        self.assertIn("reply", data)
        self.assertTrue(data["reply"])

    def test_weather_requires_city_query(self):
        response = self.client.get("/weather")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Missing 'city' query parameter.")

    @patch.dict(os.environ, {"OPENWEATHER_API_KEY": "test-key"}, clear=False)
    @patch("app.requests.get")
    def test_weather_returns_not_found_for_unknown_city(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.ok = False
        mock_response.json.return_value = {"cod": "404", "message": "city not found"}
        mock_get.return_value = mock_response

        response = self.client.get("/weather?city=unknown-city")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json()["error"], "City not found.")


if __name__ == "__main__":
    unittest.main()
