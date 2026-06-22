# UrbanAir IQ

AI-powered Urban Air Quality Intelligence Platform for smart city intervention.

## 1. Project Title

**UrbanAir IQ — Smart City Air Quality Intelligence**

UrbanAir IQ turns air-quality forecasts into practical city actions, source evidence, hotspot intelligence, and public health guidance.

## 2. Problem Statement

Urban air-quality teams often work with fragmented monitoring data and delayed responses. AQI readings explain what is happening now, but city officers also need to know what may happen next, which zones are most exposed, what is likely causing the pollution, and which intervention should be prioritized.

UrbanAir IQ addresses this gap with one decision-support dashboard for forecasting, hotspot monitoring, source attribution, enforcement planning, citizen advisories, and model evaluation.

## 3. Solution Overview

The platform combines local machine-learning artifacts with an offline-ready FastAPI backend and a responsive Next.js dashboard. It predicts AQI at 24h, 48h, and 72h horizons, maps monitoring zones, applies evidence-based source rules, scores enforcement recommendations, and produces English or Hindi public advisories.

The demo does not require real-time external data, the Kaggle API, `kaggle.json`, or any credentials. If an artifact or live feature vector is unavailable, the backend uses safe local fallback data so the demonstration remains operational.

## 4. Features

- Citywide dashboard with current AQI, forecast risk, hotspot summary, and quick actions
- OpenStreetMap hotspot map with AQI-colored markers, filters, legend, and simulated risk overlays
- Current, 24h, 48h, and 72h forecast charts and zone-level forecast table
- Rule-based pollution source attribution with confidence, evidence, and contribution charts
- Officer Action Center with priority scores, department routing, workflow statuses, and filters
- English and simple Hindi/Hinglish health advisories for citizens, schools, and hospitals
- Model performance report with RMSE comparison, evaluation strategy, and JSON export
- Friendly loading and API error states throughout the frontend
- Offline demo data and missing-artifact fallbacks in the backend

## 5. AI/ML Model Details

- **Main production model:** `urban_air_iq_model_bundle.pkl`
- **Forecast horizons:** 24h, 48h, and 72h
- **Model family selected in the supplied artifacts:** Gradient Boosting
- **Metrics source:** `model_summary.csv`
- **Demo predictions source:** `demo_predictions.csv`
- **Metadata:** `urban_air_iq_all_metadata.json` and horizon-specific metadata JSON files

The model bundle contains the three forecast models and their metadata. Features include historical AQI, pollutant levels, calendar/time features, AQI lags and rolling values, and station/city patterns. `demo_predictions.csv` supplies consistent offline predictions when a complete live model feature vector is not available.

Source attribution uses transparent rules for NO2/CO, PM10, SO2, PM2.5, AQI severity, and wind/dispersion when available. The recommendation engine combines AQI severity, trend, zone vulnerability, source confidence, and operational feasibility.

## 6. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Map | React Leaflet, Leaflet, OpenStreetMap |
| Backend | FastAPI, Python, Uvicorn |
| ML runtime | scikit-learn 1.6.1, joblib, NumPy, pandas |
| Data/artifacts | Local PKL, JSON, and CSV files |

```text
urban-air-iq/
  frontend/          Next.js dashboard
  backend/
    app/             FastAPI application and intelligence logic
    artifacts/       Local models, metadata, metrics, and demo predictions
  README.md
```

## 7. How to Run the Backend

Python 3.11 or newer is recommended. From the project root:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On macOS or Linux, activate the environment with:

```bash
source .venv/bin/activate
```

Verify the backend:

- Health: `http://localhost:8000/health`
- Interactive API docs: `http://localhost:8000/docs`

The backend loads artifacts from `backend/artifacts/`. Keep `urban_air_iq_model_bundle.pkl`, `model_summary.csv`, `demo_predictions.csv`, and the supplied metadata files in that directory.

## 8. How to Run the Frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
```

Create `frontend/.env.local` from `.env.example`, or add:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dashboard:

```bash
npm run dev
```

Open `http://localhost:3000`. If `NEXT_PUBLIC_API_URL` is not set, the frontend automatically uses `http://localhost:8000`.

For a production check:

```bash
npm run build
npm run start
```

OpenStreetMap tiles require network access to display the base map; all UrbanAir IQ API data and intelligence continue to run from local files.

### GitHub and Vercel Deployment

Use these names:

- **GitHub repository:** `urban-air-iq`
- **Vercel project:** `urban-air-iq`
- **Backend service:** `urban-air-iq-api`

If a name is already taken, add your GitHub username, for example `urban-air-iq-yourname`.

#### Files to Upload

Push the complete `urban-air-iq/` folder to one GitHub repository. Include both `frontend/` and `backend/`, the local model artifacts in `backend/artifacts/`, both lock/package files, requirements files, and this README.

Do not upload generated or private files:

- `node_modules/`
- `.next/`
- `.venv/`
- `__pycache__/`
- `.env` or `.env.local`

The included `.gitignore` excludes these files automatically. The model artifacts are required by the deployed API and must remain tracked because they are small enough for a normal GitHub repository.

#### Push to GitHub

Run these commands from the `urban-air-iq` folder after creating an empty GitHub repository named `urban-air-iq`:

```bash
git init
git add .
git commit -m "Build UrbanAir IQ smart city air quality platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/urban-air-iq.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username. Do not initialize the GitHub repository with another README or `.gitignore`, because both already exist locally.

#### Deploy the Backend First

Deploy the `backend/` directory to a Python hosting service such as Render or Railway using:

- **Service name:** `urban-air-iq-api`
- **Root directory:** `backend`
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health check:** `/health`
- **Environment variable:** `FRONTEND_ORIGINS=https://urban-air-iq.vercel.app`

Use the exact Vercel URL assigned to your frontend. Multiple allowed frontend URLs can be supplied as a comma-separated `FRONTEND_ORIGINS` value.

Copy the deployed backend URL, for example `https://urban-air-iq-api.example.com`.

#### Deploy the Frontend on Vercel

Vercel imports the GitHub repository; do not upload a second copy of the files manually.

1. In Vercel, select **Add New → Project** and import the `urban-air-iq` GitHub repository.
2. Set **Project Name** to `urban-air-iq`.
3. Set **Root Directory** to `frontend`.
4. Keep the detected framework as **Next.js**.
5. Add `NEXT_PUBLIC_API_URL` with the public backend URL, without a trailing slash.
6. Deploy the project.

After Vercel provides the final frontend URL, confirm that the same exact URL is present in the backend `FRONTEND_ORIGINS` environment variable, then redeploy/restart the backend if that value changed.

## 9. Demo Flow

1. Start the backend and confirm `/health` reports `model_loaded: true` and `data_source: demo_predictions.csv`.
2. Open **Dashboard** and select a city to show current AQI, forecasts, hotspots, and quick actions.
3. Open **Hotspot Map**, filter by AQI/source, toggle risk overlays, and select a marker for station intelligence.
4. Open **AQI Forecast** to compare the current, 24h, 48h, and 72h outlooks.
5. Open **Source Attribution** and change zones to explain the dominant source and evidence.
6. Open **Action Center**, filter the officer queue, and click **Generate Action Plan**.
7. Open **Citizen Advisory**, select a high-risk zone, switch to Hindi, and generate public guidance.
8. Open **Reports** to show model metrics, baseline improvement, evaluation strategy, and report export.

## 10. Future Scope

- Connect verified real-time monitoring, traffic, weather, fire, and satellite feeds
- Add geospatial forecasting at ward and street level
- Retrain and calibrate models with newer city-specific observations
- Add uncertainty intervals and drift monitoring for every forecast horizon
- Track intervention ownership, deadlines, evidence uploads, and measured impact
- Send multilingual advisories through municipal apps, SMS, and public displays
- Add role-based access, audit logs, and deployment-ready data governance.

## Live Demo


