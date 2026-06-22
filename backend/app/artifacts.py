from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any


FALLBACK_PREDICTIONS = [
    {
        "city": "Delhi",
        "station": "Station_D1",
        "date": "2026-06-22",
        "current_aqi": "238",
        "current_category": "Poor",
        "predicted_aqi_24h": "265",
        "category_24h": "Poor",
        "trend_24h": "Worsening",
        "confidence_24h": "60",
        "predicted_aqi_48h": "281",
        "category_48h": "Poor",
        "trend_48h": "Worsening",
        "confidence_48h": "60",
        "predicted_aqi_72h": "246",
        "category_72h": "Poor",
        "trend_72h": "Stable",
        "confidence_72h": "60",
    },
    {
        "city": "Mumbai",
        "station": "Station_M1",
        "date": "2026-06-22",
        "current_aqi": "184",
        "current_category": "Moderate",
        "predicted_aqi_24h": "224",
        "category_24h": "Poor",
        "trend_24h": "Worsening",
        "confidence_24h": "60",
        "predicted_aqi_48h": "239",
        "category_48h": "Poor",
        "trend_48h": "Worsening",
        "confidence_48h": "60",
        "predicted_aqi_72h": "216",
        "category_72h": "Poor",
        "trend_72h": "Worsening",
        "confidence_72h": "60",
    },
    {
        "city": "Bangalore",
        "station": "Station_B1",
        "date": "2026-06-22",
        "current_aqi": "132",
        "current_category": "Moderate",
        "predicted_aqi_24h": "176",
        "category_24h": "Moderate",
        "trend_24h": "Worsening",
        "confidence_24h": "60",
        "predicted_aqi_48h": "191",
        "category_48h": "Moderate",
        "trend_48h": "Worsening",
        "confidence_48h": "60",
        "predicted_aqi_72h": "168",
        "category_72h": "Moderate",
        "trend_72h": "Stable",
        "confidence_72h": "60",
    },
]

FALLBACK_METRICS = [
    {
        "Forecast": horizon,
        "Best Model": "Gradient Boosting",
        "RMSE": "145.0",
        "MAE": "126.0",
        "R2": "-0.01",
        "Baseline RMSE": "204.0",
        "Improvement %": "29.0",
        "Confidence": "60.0",
    }
    for horizon in ("24h", "48h", "72h")
]


class ArtifactStore:
    """Loads local artifacts without making backend startup depend on them."""

    def __init__(self, artifacts_dir: Path) -> None:
        self.artifacts_dir = artifacts_dir
        self.errors: list[str] = []
        self.model_bundle: Any | None = None
        self.metadata: dict[str, Any] = {}
        self.predictions: list[dict[str, str]] = []
        self.metrics: list[dict[str, str]] = []
        self.using_fallback_predictions = False
        self.using_fallback_metrics = False
        self._load_all()

    def _load_all(self) -> None:
        self.model_bundle = self._load_model_bundle()
        self.metadata = self._load_json("urban_air_iq_all_metadata.json")
        self.predictions = self._load_csv("demo_predictions.csv")
        self.metrics = self._load_csv("model_summary.csv")

        if not self.predictions:
            self.using_fallback_predictions = True
            self.predictions = FALLBACK_PREDICTIONS
        if not self.metrics:
            self.using_fallback_metrics = True
            self.metrics = FALLBACK_METRICS

    def _load_model_bundle(self) -> Any | None:
        path = self.artifacts_dir / "urban_air_iq_model_bundle.pkl"
        if not path.exists():
            self.errors.append(f"Missing model artifact: {path.name}")
            return None

        try:
            import joblib

            return joblib.load(path)
        except Exception as exc:  # Model compatibility errors must not stop demo mode.
            self.errors.append(f"Could not load {path.name}: {exc}")
            return None

    def _load_json(self, filename: str) -> dict[str, Any]:
        path = self.artifacts_dir / filename
        if not path.exists():
            self.errors.append(f"Missing metadata artifact: {filename}")
            return {}

        try:
            with path.open("r", encoding="utf-8") as file:
                data = json.load(file)
                return data if isinstance(data, dict) else {}
        except (OSError, json.JSONDecodeError) as exc:
            self.errors.append(f"Could not load {filename}: {exc}")
            return {}

    def _load_csv(self, filename: str) -> list[dict[str, str]]:
        path = self.artifacts_dir / filename
        if not path.exists():
            self.errors.append(f"Missing data artifact: {filename}")
            return []

        try:
            with path.open("r", encoding="utf-8-sig", newline="") as file:
                return list(csv.DictReader(file))
        except (OSError, csv.Error) as exc:
            self.errors.append(f"Could not load {filename}: {exc}")
            return []

    @property
    def data_source(self) -> str:
        return "fallback" if self.using_fallback_predictions else "demo_predictions.csv"


ARTIFACTS_DIR = Path(__file__).resolve().parents[1] / "artifacts"
store = ArtifactStore(ARTIFACTS_DIR)
