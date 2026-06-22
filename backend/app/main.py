from __future__ import annotations

import os
from typing import Literal

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .artifacts import store
from .intelligence import actions, find_zone, forecast, get_aqi_category, overview, public_zones, reports, source_attribution_for_zones
from .schemas import (
    ActionResponse,
    AdvisoryResponse,
    OverviewResponse,
    ReportResponse,
    SourceAttributionResponse,
    ZoneResponse,
)

app = FastAPI(
    title="UrbanAir IQ API",
    version="1.0.0",
    description="Offline-ready urban air quality intelligence backend.",
)

local_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
deployed_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[*local_origins, *deployed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unexpected_error_handler(_, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"detail": "The backend could not complete this request.", "error": str(exc)},
    )


@app.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "service": "UrbanAir IQ API",
        "offline_ready": True,
        "model_loaded": store.model_bundle is not None,
        "data_source": store.data_source,
        "artifact_errors": store.errors,
    }


@app.get("/api/overview", response_model=OverviewResponse)
def get_overview() -> dict:
    return overview()


@app.get("/api/zones", response_model=list[ZoneResponse])
def get_zones() -> list[dict]:
    return public_zones()


@app.get("/api/forecast")
def get_forecast() -> dict:
    return forecast()


@app.get("/api/source-attribution", response_model=list[SourceAttributionResponse])
def get_source_attribution() -> list[dict]:
    return source_attribution_for_zones()


@app.get("/api/actions", response_model=list[ActionResponse])
def get_actions() -> list[dict]:
    return actions()


@app.get("/api/advisory", response_model=AdvisoryResponse)
def get_advisory(
    zone: str = Query(default="Citywide", min_length=1),
    language: Literal["english", "hindi"] = Query(default="english"),
) -> dict:
    selected_zone = find_zone(zone)
    if selected_zone is None:
        snapshot = overview()
        zone_label = "Citywide"
        current_aqi = snapshot["current_aqi"]
    else:
        zone_label = selected_zone["zone"]
        current_aqi = selected_zone["current_aqi"]

    category = get_aqi_category(current_aqi)
    english_messages = {
        "Good": "Air quality is good. Normal outdoor activity is safe.",
        "Satisfactory": "Air quality is acceptable. Sensitive people may take breaks during prolonged outdoor activity.",
        "Moderate": "Sensitive groups should reduce prolonged outdoor exertion and keep medication available.",
        "Poor": "Reduce outdoor activity, use a well-fitted mask, and keep windows closed during peak pollution hours.",
        "Very Poor": "Avoid outdoor exertion. Children, older adults, and people with heart or lung conditions should remain indoors.",
        "Severe": "Stay indoors, avoid all outdoor exercise, use indoor air filtration, and seek medical help for breathing difficulty.",
    }
    hindi_messages = {
        "Good": "वायु गुणवत्ता अच्छी है। सामान्य बाहरी गतिविधियां सुरक्षित हैं।",
        "Satisfactory": "वायु गुणवत्ता स्वीकार्य है। संवेदनशील लोग लंबे समय की बाहरी गतिविधि में विराम लें।",
        "Moderate": "संवेदनशील समूह लंबे समय की बाहरी मेहनत कम करें और आवश्यक दवा साथ रखें।",
        "Poor": "बाहरी गतिविधि कम करें, सही फिट वाला मास्क पहनें और अधिक प्रदूषण के समय खिड़कियां बंद रखें।",
        "Very Poor": "बाहरी मेहनत से बचें। बच्चे, बुजुर्ग और हृदय या फेफड़े के रोगी घर के अंदर रहें।",
        "Severe": "घर के अंदर रहें, बाहरी व्यायाम न करें, एयर फिल्ट्रेशन का उपयोग करें और सांस में तकलीफ पर चिकित्सा सहायता लें।",
    }
    messages = hindi_messages if language == "hindi" else english_messages

    return {
        "zone": zone_label,
        "language": language,
        "current_aqi": current_aqi,
        "category": category,
        "message": messages[category],
    }


@app.get("/api/reports", response_model=list[ReportResponse])
def get_reports() -> list[dict]:
    return reports()
