# UrbanAir IQ Backend

Offline-ready FastAPI backend for UrbanAir IQ. It loads the production model bundle and local CSV/JSON artifacts from `artifacts/`. If prediction or metric files are unavailable, built-in demo data keeps every endpoint operational.

## Requirements

- Python 3.11 or newer
- No external API keys or Kaggle credentials

## Run locally

From the `backend` directory:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open API documentation at `http://localhost:8000/docs` or check `http://localhost:8000/health`.

## Offline artifacts

Keep these local files in `backend/artifacts/`:

- `urban_air_iq_model_bundle.pkl` (main production bundle)
- `urban_air_iq_all_metadata.json`
- `model_summary.csv`
- `demo_predictions.csv`
- the standalone 24h, 48h, and 72h model and metadata files

The API does not call real-time services and does not use the Kaggle API.

## Endpoints

- `GET /health`
- `GET /api/overview`
- `GET /api/zones`
- `GET /api/forecast`
- `GET /api/source-attribution`
- `GET /api/actions`
- `GET /api/advisory?zone=Connaught%20Place&language=english`
- `GET /api/reports`
