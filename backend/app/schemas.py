from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class OverviewResponse(BaseModel):
    city: str
    current_aqi: float
    predicted_aqi_24h: float
    predicted_aqi_48h: float
    predicted_aqi_72h: float
    severe_zones: int
    main_pollutant: str
    risk_level: str
    action_required: bool


class ZoneResponse(BaseModel):
    id: str
    city: str
    zone: str
    latitude: float
    longitude: float
    current_aqi: float
    predicted_aqi_24h: float
    predicted_aqi_48h: float
    predicted_aqi_72h: float
    category: str
    trend: str
    confidence: float
    main_source: str
    priority: str


class SourceAttributionResponse(BaseModel):
    zone: str
    main_source: str
    confidence: float
    evidence: list[str]
    contribution_breakdown: dict[str, int]
    pollutant_contribution_percentages: dict[str, int]


class ActionResponse(BaseModel):
    priority: str
    priority_score: int
    zone: str
    action: str
    department: str
    reason: str
    expected_impact: str
    status: str


class AdvisoryResponse(BaseModel):
    zone: str
    language: Literal["english", "hindi"]
    current_aqi: float
    category: str
    message: str


class ReportResponse(BaseModel):
    forecast: str
    rmse: float
    mae: float
    r2: float
    baseline_rmse: float
    improvement_percentage: float
    confidence: float
    model_name: str
