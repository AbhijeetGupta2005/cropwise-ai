# Deployment Guide

This guide summarizes the cleanest deployment setup for CropWise AI using free
or low-friction hosting:

- **Frontend:** Vercel
- **Backend:** Render

## 1. Frontend deployment on Vercel

### Project root

```text
React_Frontend/agri-ai
```

### Build settings

- Build command: `npm run build`
- Output directory: `build`

### Frontend environment variable

```env
REACT_APP_API_BASE_URL=https://your-render-backend-url
```

### Routing support

The frontend includes `vercel.json` with a rewrite to `index.html`, so routes
like `/crop`, `/fertilizer`, and `/history` keep working after refresh.

## 2. Backend deployment on Render

### Project root

```text
Flask_API
```

### Build settings

- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app --bind 0.0.0.0:$PORT`
- Health check path: `/health`

### Required backend environment variables

```env
GEMINI_API_KEY=your_backend_only_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODELS=gemini-2.5-flash-lite,gemini-2.0-flash
GEMINI_HTTP_REFERER=https://your-vercel-frontend-url
OPENWEATHER_API_KEY=your_backend_only_openweather_api_key
```

Keep `GEMINI_FALLBACK_MODELS` configured in deployment as a comma-separated
list so the AI advisor can fail over cleanly before local fallback is used.

### Included deployment helpers

- `render.yaml` - Render blueprint
- `Flask_API/Procfile` - Gunicorn start declaration
- `Flask_API/runtime.txt` - Python runtime target

## 3. Post-deployment checks

After deployment, confirm these:

### Backend

- `GET /health` returns `{"status":"ok"}`
- `GET /weather?city=Delhi` responds without exposing the weather API key
- `POST /predict_crop` accepts valid crop input
- `POST /predict_fertilizer` accepts valid fertilizer input
- `POST /ai-recommend` returns either live or fallback structured metadata

Sample checks:

```powershell
curl https://your-render-backend-url/health
curl "https://your-render-backend-url/weather?city=Delhi"
```

### Frontend

- landing page loads
- `/crop` opens directly after refresh
- `/fertilizer` opens directly after refresh
- `/history` opens directly after refresh
- AI advisor can switch languages and seasons

## 4. Deployment notes

### Gemini

If Gemini responds with temporary overload or quota errors:

- CropWise AI retries temporary failures
- backup Gemini models can be used
- the app falls back to local advisory guidance if needed

### Weather

The OpenWeather key is backend-only. Do not put it into the frontend `.env`.

### Local storage

Prediction history, profile, and language preference are stored in the user's
browser. They are not yet stored in a backend database.

## 5. Troubleshooting

### Frontend cannot reach backend

Check:

- `REACT_APP_API_BASE_URL`
- CORS behavior from the deployed frontend domain
- backend service is awake and `/health` works

### AI routes work locally but not in deployment

Check:

- `GEMINI_API_KEY`
- `GEMINI_HTTP_REFERER`
- fallback models are configured
- Render logs for `429` or `503` messages

### Weather autofill fails

Check:

- `OPENWEATHER_API_KEY` is set in backend environment variables
- backend `/weather` route works directly

## 6. Suggested demo URLs

Once deployed, these are the most useful pages to verify or present:

- `/`
- `/crop`
- `/fertilizer`
- `/history`
- `/health`
