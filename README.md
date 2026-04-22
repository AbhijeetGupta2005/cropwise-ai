# CropWise AI Web App

CropWise AI is a full-stack agriculture advisory application built with a
React frontend and a Flask backend. It combines classical machine learning
models for crop and fertilizer recommendation with a Gemini-powered AI advisor
for region- and season-based crop guidance.

## What This Project Does

CropWise AI currently includes:

- Crop recommendation using ensemble ML models
- Fertilizer recommendation using ensemble ML models
- AI crop advisor based on location and cropping season
- AI follow-up chat for crop-specific questions
- Hindi, English, and Hinglish response support in the AI advisor
- Rule-based fallback recommendations when Gemini is rate-limited
- Voice input for location entry in supported browsers

## Project Structure

```text
project-root/
|-- Flask_API/
|   |-- app.py
|   |-- models/
|   |-- requirements.txt
|   `-- .env.example
`-- React_Frontend/
    `-- agri-ai/
        |-- src/
        |-- public/
        `-- package.json
```

## Tech Stack

- Frontend: React, Axios, React Router
- Backend: Flask, Flask-CORS
- ML: scikit-learn, XGBoost, joblib, NumPy
- AI: Google Gemini API
- Styling: custom CSS

## Features

### 1. Crop Recommendation

The crop recommender accepts:

- Nitrogen
- Phosphorous
- Potassium
- Temperature
- Humidity
- Soil pH
- Rainfall

It uses multiple trained models and returns:

- `xgb_model_prediction`
- `rf_model_prediction`
- `knn_model_prediction`
- probability scores for each model
- `final_prediction`

### 2. Fertilizer Recommendation

The fertilizer recommender accepts:

- Temperature
- Humidity
- Moisture
- Soil Type
- Crop Type
- Nitrogen
- Potassium
- Phosphorous

It returns:

- `xgb_model_prediction`
- `rf_model_prediction`
- `svm_model_prediction`
- probability scores for each model
- `final_prediction`

### 3. AI Crop Advisor

The AI advisor accepts:

- location or district
- season: `Kharif`, `Rabi`, or `Zaid`
- response language: `English`, `Hindi`, or `Hinglish`

It provides 3 crop suggestions with:

- crop name
- reason
- confidence
- season fit
- water need
- soil type

When Gemini quota is unavailable, the backend automatically falls back to
region-aware rule-based recommendations so the UI still works.

### 4. AI Follow-up Chat

After getting AI crop suggestions, users can ask follow-up questions such as:

- irrigation planning
- pest concerns
- intercropping
- market demand

The follow-up chat also supports English, Hindi, and Hinglish.

## API Endpoints

Base URL in local development:

```text
http://localhost:5000
```

Available routes:

- `POST /predict_crop`
- `POST /predict_fertilizer`
- `POST /ai-recommend`
- `POST /ai-follow-up`

### Example Crop Recommendation Response

```json
{
  "xgb_model_prediction": "rice",
  "rf_model_prediction": "rice",
  "knn_model_prediction": "rice",
  "xgb_model_probability": 99.2,
  "rf_model_probability": 99.3,
  "knn_model_probability": 99.5,
  "final_prediction": "rice"
}
```

### Example Fertilizer Recommendation Response

```json
{
  "xgb_model_prediction": "Urea",
  "rf_model_prediction": "Urea",
  "svm_model_prediction": "Urea",
  "xgb_model_probability": 99.2,
  "rf_model_probability": 99.3,
  "svm_model_probability": 99.5,
  "final_prediction": "Urea"
}
```

### Example AI Recommendation Response

```json
[
  {
    "crop": "Rice",
    "reason": "Suitable for monsoon conditions and water-rich fields.",
    "confidence": "High",
    "season_fit": "Good",
    "water_need": "High",
    "soil_type": "Clay loam"
  }
]
```

## Local Setup

### 1. Frontend

Open PowerShell in:

```powershell
cd React_Frontend\agri-ai
```

Install dependencies:

```powershell
npm install
```

Run development server:

```powershell
npm start
```

The React app runs on:

```text
http://localhost:3000
```

### 2. Backend

Open PowerShell in:

```powershell
cd Flask_API
```

Recommended Python runtime:

```text
Python 3.11
```

Create and use the standard backend virtual environment:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Create and configure your backend `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_HTTP_REFERER=http://localhost:3000/
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Optional developer tools:

```powershell
pip install -r requirements-dev.txt
```

Run Flask:

```powershell
python app.py
```

The Flask API runs on:

```text
http://127.0.0.1:5000
```

## Free Hosting Setup

The cleanest free deployment setup for this project is:

- frontend on Vercel
- backend on Render

### Frontend on Vercel

Project root:

```text
React_Frontend/agri-ai
```

Build command:

```text
npm run build
```

Output directory:

```text
build
```

Required environment variable:

```env
REACT_APP_API_BASE_URL=https://your-render-backend-url
```

This repo already includes `vercel.json` so React Router routes like `/crop`,
`/fertilizer`, and `/history` continue to work after refresh.

### Backend on Render

Project root:

```text
Flask_API
```

Build command:

```text
pip install -r requirements.txt
```

Start command:

```text
gunicorn app:app --bind 0.0.0.0:$PORT
```

Required environment variables:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_HTTP_REFERER=https://your-vercel-frontend-url
```

The repo root also includes `render.yaml` for a Render web service blueprint,
and the backend exposes `GET /health` for deployment health checks.

## Important Notes

### Gemini API Key Restrictions

If you use a website-restricted Gemini API key in local development, make sure
your Google Cloud key configuration allows:

- `http://localhost:3000/*`
- `http://127.0.0.1:3000/*`

This project sends a local referrer header from Flask to support that setup.

### Gemini Rate Limits

If Gemini responds with `429 Too Many Requests`, the app does not fail
completely:

- `/ai-recommend` falls back to rule-based crop suggestions
- `/ai-follow-up` returns a practical fallback advisory message

### Python Environment Note

The backend runtime target is now Python 3.11, and the dependency manifests are
split into runtime and developer requirements.

The ML models in this project were trained and serialized with older library
versions. If crop or fertilizer prediction fails because of model loading
issues, recreate the backend environment from `requirements.txt` first before
debugging the model files themselves.

The current backend `requirements.txt` has been refreshed from the working
`venv312` environment and smoke-tested against both crop and fertilizer
prediction endpoints. The file `requirements-working-venv312.txt` is kept as a
reference snapshot of that known-good environment during migration to a single
standard backend venv.

The intended backend environment is now `Flask_API/.venv`. Older virtual
environments such as `venv`, `venv38`, and `venv312` are legacy leftovers and
should not be used for day-to-day development.

## Browser Support

- AI advisor works in modern Chromium-based browsers
- Voice input depends on Web Speech API support
- If voice input is unavailable in Brave, Chrome or Edge usually works better

## Build Commands

Frontend production build:

```powershell
cd React_Frontend\agri-ai
npm run build
```

## Current UX Improvements Included

- improved AI advisor cards
- offline advisory mode indicator
- Hindi and Hinglish language selector
- smarter follow-up suggestions
- better city input styling in Chromium browsers
- clearer voice input feedback and permission handling

## Attribution

This project is a modified derivative of the open-source GitHub repository
[`venugopalkadamba/AgriAI_WebApp`](https://github.com/venugopalkadamba/AgriAI_WebApp).

The current version includes substantial changes to branding, documentation,
frontend experience, and AI-assisted advisory features, while retaining parts
of the original project structure and recommendation workflow.

## License

This repository retains the `GPL-3.0` license from the original base project.
If you distribute this project or modified versions of it, you should continue
to comply with the terms of `GPL-3.0`. See the `LICENSE` file for details.
