from __future__ import annotations

import re
from collections import Counter
from typing import Any

from .artifacts import store


STATIONS: dict[str, dict[str, Any]] = {
    "Station_D1": {
        "zone": "Connaught Place",
        "latitude": 28.6315,
        "longitude": 77.2167,
        "profile": "traffic",
    },
    "Station_D2": {
        "zone": "Anand Vihar",
        "latitude": 28.6469,
        "longitude": 77.3160,
        "profile": "construction",
    },
    "Station_M1": {
        "zone": "Bandra",
        "latitude": 19.0596,
        "longitude": 72.8295,
        "profile": "traffic",
    },
    "Station_M2": {
        "zone": "Chembur",
        "latitude": 19.0522,
        "longitude": 72.9005,
        "profile": "industrial",
    },
    "Station_C1": {
        "zone": "T. Nagar",
        "latitude": 13.0418,
        "longitude": 80.2341,
        "profile": "stagnation",
        "sensitive_zone": True,
    },
    "Station_C2": {
        "zone": "Manali",
        "latitude": 13.1667,
        "longitude": 80.2667,
        "profile": "industrial",
    },
    "Station_K1": {
        "zone": "Ballygunge",
        "latitude": 22.5280,
        "longitude": 88.3659,
        "profile": "stagnation",
        "sensitive_zone": True,
    },
    "Station_K2": {
        "zone": "Howrah",
        "latitude": 22.5958,
        "longitude": 88.2636,
        "profile": "construction",
    },
    "Station_B1": {
        "zone": "Silk Board",
        "latitude": 12.9177,
        "longitude": 77.6233,
        "profile": "traffic",
    },
    "Station_B2": {
        "zone": "Peenya",
        "latitude": 13.0295,
        "longitude": 77.5197,
        "profile": "industrial",
    },
}

SOURCE_PROFILES = {
    "traffic": {
        "main_source": "Traffic emissions",
        "contributions": {"NO2": 42, "CO": 28, "PM2.5": 18, "Other": 12},
    },
    "construction": {
        "main_source": "Construction dust",
        "contributions": {"PM10": 58, "PM2.5": 18, "NO2": 10, "Other": 14},
    },
    "industrial": {
        "main_source": "Industrial emissions",
        "contributions": {"SO2": 48, "PM2.5": 22, "NO2": 12, "Other": 18},
    },
    "stagnation": {
        "main_source": "Waste burning / fine particulate accumulation",
        "contributions": {"PM2.5": 62, "PM10": 18, "CO": 10, "Other": 10},
    },
    "meteorological": {
        "main_source": "Meteorological stagnation",
        "contributions": {"PM2.5": 44, "PM10": 24, "NO2": 18, "Other": 14},
    },
}


def as_float(value: Any, default: float = 0.0) -> float:
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return default


def get_aqi_category(aqi: float) -> str:
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Satisfactory"
    if aqi <= 200:
        return "Moderate"
    if aqi <= 300:
        return "Poor"
    if aqi <= 400:
        return "Very Poor"
    return "Severe"


def get_aqi_color(category: str) -> str:
    colors = {
        "good": "#00B050",
        "satisfactory": "#92D050",
        "moderate": "#FFFF00",
        "poor": "#FF9900",
        "very poor": "#FF0000",
        "severe": "#99004C",
    }
    return colors.get(category.strip().casefold(), "#64748B")


def get_trend(current: float, predicted: float) -> str:
    difference = predicted - current
    if difference >= 15:
        return "Worsening"
    if difference <= -15:
        return "Improving"
    return "Stable"


def priority_for(aqi: float) -> str:
    if aqi > 400:
        return "Critical"
    if aqi > 300:
        return "Very High"
    if aqi > 200:
        return "High"
    if aqi > 100:
        return "Medium"
    return "Low"


def _latest_station_rows() -> list[dict[str, str]]:
    latest: dict[tuple[str, str], dict[str, str]] = {}
    for row in store.predictions:
        city = row.get("city", "Unknown City")
        station = row.get("station", "Unknown Station")
        latest[(city, station)] = row
    return list(latest.values())


def _numeric_value(row: dict[str, Any], *candidate_names: str) -> float | None:
    normalized = {re.sub(r"[^a-z0-9]", "", str(key).casefold()): value for key, value in row.items()}
    for name in candidate_names:
        value = normalized.get(re.sub(r"[^a-z0-9]", "", name.casefold()))
        if value in (None, ""):
            continue
        try:
            return float(value)
        except (TypeError, ValueError):
            continue
    return None


def source_attribution(row: dict[str, Any]) -> dict[str, Any]:
    """Attribute a dominant source using pollutant thresholds or transparent AQI inference."""

    no2 = _numeric_value(row, "NO2")
    co = _numeric_value(row, "CO")
    pm10 = _numeric_value(row, "PM10")
    so2 = _numeric_value(row, "SO2")
    pm25 = _numeric_value(row, "PM2.5", "PM25")
    wind_speed = _numeric_value(row, "wind_speed", "wind speed", "windspeed")
    current_aqi = _numeric_value(row, "current_aqi", "AQI") or 0.0
    predicted_values = [
        value
        for value in (
            _numeric_value(row, "predicted_aqi_24h"),
            _numeric_value(row, "predicted_aqi_48h"),
            _numeric_value(row, "predicted_aqi_72h"),
        )
        if value is not None
    ]
    peak_aqi = max([current_aqi, *predicted_values])
    category = get_aqi_category(current_aqi)
    candidates: list[tuple[int, str, list[str]]] = []

    if no2 is not None and co is not None and no2 >= 80 and co >= 2:
        candidates.append(
            (92, "traffic", [f"NO2 is elevated at {no2:.1f}", f"CO is elevated at {co:.2f}", "The combined NO2-CO signature is consistent with vehicle exhaust"])
        )
    if pm10 is not None and pm10 >= 150:
        candidates.append(
            (86, "construction", [f"PM10 is elevated at {pm10:.1f}", "Coarse particulate dominance is consistent with road or construction dust"])
        )
    if so2 is not None and so2 >= 80:
        candidates.append(
            (91, "industrial", [f"SO2 is elevated at {so2:.1f}", "An elevated SO2 signature is consistent with fuel combustion in industrial units"])
        )
    if pm25 is not None and pm25 >= 90 and current_aqi > 200:
        candidates.append(
            (90, "stagnation", [f"PM2.5 is elevated at {pm25:.1f}", f"AQI is {current_aqi:.0f} ({category})", "Fine particulate buildup is consistent with local burning or accumulated combustion emissions"])
        )
    if wind_speed is not None and wind_speed < 2:
        candidates.append(
            (84, "meteorological", [f"Wind speed is low at {wind_speed:.1f}", "Low ventilation limits pollutant dispersion and supports meteorological stagnation"])
        )

    if candidates:
        confidence, profile_name, evidence = max(candidates, key=lambda candidate: candidate[0])
    else:
        profile_name = str(row.get("_profile", "stagnation"))
        if row.get("_widespread_high_aqi"):
            profile_name = "meteorological"
        if profile_name not in SOURCE_PROFILES:
            profile_name = "stagnation" if peak_aqi > 200 else "traffic"

        confidence = 72 if peak_aqi > 200 else 64
        context_evidence = {
            "traffic": "Station context and the urban AQI pattern are consistent with traffic-related emissions",
            "construction": "Station context and the coarse-dust risk pattern are consistent with construction activity",
            "industrial": "Station context and the sustained AQI pattern are consistent with industrial combustion emissions",
            "stagnation": "The AQI pattern is consistent with fine particulate accumulation when direct pollutant readings are unavailable",
            "meteorological": "Elevated AQI across multiple stations indicates a shared low-dispersion episode",
        }
        evidence = [
            "Direct pollutant columns are unavailable; attribution uses AQI, forecast behaviour, and station context",
            f"Current AQI is {current_aqi:.0f} ({category}) and the peak forecast is {peak_aqi:.0f}",
            context_evidence[profile_name],
        ]

    profile = SOURCE_PROFILES[profile_name]
    contributions = profile["contributions"]
    return {
        "main_source": profile["main_source"],
        "confidence": confidence,
        "evidence": evidence,
        "contribution_breakdown": contributions,
        "pollutant_contribution_percentages": contributions,
    }


def build_zones() -> list[dict[str, Any]]:
    zones: list[dict[str, Any]] = []
    for index, row in enumerate(_latest_station_rows(), start=1):
        station = row.get("station", f"Station_{index}")
        city = row.get("city", "Unknown City")
        station_info = STATIONS.get(station, {})
        forecasts = [
            as_float(row.get("predicted_aqi_24h")),
            as_float(row.get("predicted_aqi_48h")),
            as_float(row.get("predicted_aqi_72h")),
        ]
        current_aqi = as_float(row.get("current_aqi"))
        profile = station_info.get("profile", "stagnation")
        slug = re.sub(r"[^a-z0-9]+", "-", f"{city}-{station}".lower()).strip("-")

        zone = {
                "id": slug,
                "city": city,
                "zone": station_info.get("zone", station.replace("_", " ")),
                "latitude": station_info.get("latitude", 20.5937 + index * 0.01),
                "longitude": station_info.get("longitude", 78.9629 + index * 0.01),
                "current_aqi": current_aqi,
                "predicted_aqi_24h": forecasts[0],
                "predicted_aqi_48h": forecasts[1],
                "predicted_aqi_72h": forecasts[2],
                "category": get_aqi_category(current_aqi),
                "trend": get_trend(current_aqi, forecasts[0]),
                "confidence": as_float(row.get("confidence_24h"), 60.0),
                "priority": priority_for(max([current_aqi, *forecasts])),
                "_profile": profile,
                "_sensitive_zone": bool(station_info.get("sensitive_zone", False)),
            }
        zone["main_source"] = source_attribution(zone)["main_source"]
        zones.append(zone)
    return zones


def public_zones() -> list[dict[str, Any]]:
    return [{key: value for key, value in zone.items() if not key.startswith("_")} for zone in build_zones()]


def overview() -> dict[str, Any]:
    zones = build_zones()
    if not zones:
        return {
            "city": "Offline Demo",
            "current_aqi": 0,
            "predicted_aqi_24h": 0,
            "predicted_aqi_48h": 0,
            "predicted_aqi_72h": 0,
            "severe_zones": 0,
            "main_pollutant": "Unknown",
            "risk_level": "Unknown",
            "action_required": False,
        }

    def average(field: str) -> float:
        return round(sum(zone[field] for zone in zones) / len(zones), 2)

    forecast_fields = ("predicted_aqi_24h", "predicted_aqi_48h", "predicted_aqi_72h")
    peak_by_zone = [max(zone["current_aqi"], *(zone[field] for field in forecast_fields)) for zone in zones]
    source_counts = Counter(zone["main_source"] for zone in zones)
    dominant_source = source_counts.most_common(1)[0][0]
    pollutant_by_source = {
        "Traffic emissions": "NO2",
        "Construction dust": "PM10",
        "Industrial emissions": "SO2",
        "Waste burning / fine particulate accumulation": "PM2.5",
        "Meteorological stagnation": "PM2.5",
    }
    forecast_peak = max(average(field) for field in forecast_fields)

    return {
        "city": "Multi-city Demo",
        "current_aqi": average("current_aqi"),
        "predicted_aqi_24h": average("predicted_aqi_24h"),
        "predicted_aqi_48h": average("predicted_aqi_48h"),
        "predicted_aqi_72h": average("predicted_aqi_72h"),
        "severe_zones": sum(1 for value in peak_by_zone if value > 400),
        "main_pollutant": pollutant_by_source[dominant_source],
        "risk_level": get_aqi_category(forecast_peak),
        "action_required": max(peak_by_zone) > 200,
    }


def forecast() -> dict[str, Any]:
    zones = build_zones()
    output: dict[str, Any] = {"source": store.data_source}
    for horizon in ("24h", "48h", "72h"):
        field = f"predicted_aqi_{horizon}"
        output[horizon] = [
            {
                "zone": zone["zone"],
                "city": zone["city"],
                "aqi": zone[field],
                "category": get_aqi_category(zone[field]),
                "trend": get_trend(zone["current_aqi"], zone[field]),
                "confidence": zone["confidence"],
            }
            for zone in zones
        ]
    return output


def source_attribution_for_zones() -> list[dict[str, Any]]:
    zones = build_zones()
    widespread_high_aqi = bool(zones) and sum(
        max(zone["predicted_aqi_24h"], zone["predicted_aqi_48h"], zone["predicted_aqi_72h"]) > 200
        for zone in zones
    ) >= max(2, round(len(zones) * 0.7))

    results = []
    for zone in zones:
        attribution_input = {**zone, "_widespread_high_aqi": widespread_high_aqi and zone["_profile"] == "stagnation"}
        attribution = source_attribution(attribution_input)
        results.append(
            {
                "zone": zone["zone"],
                **attribution,
            }
        )
    return results


ACTION_RULES = {
    "Traffic emissions": {
        "action": "Restrict heavy vehicles, implement traffic diversion, and promote public transport",
        "department": "Traffic Police and Urban Transport Department",
        "reason": "The attribution indicates a vehicle-exhaust signature dominated by NO2 and CO",
        "impact": "Expected 10-15% reduction in peak-hour corridor emissions",
    },
    "Construction dust": {
        "action": "Inspect construction sites, begin road sprinkling, and enforce dust-control measures",
        "department": "Municipal Corporation and Public Works Department",
        "reason": "The attribution indicates elevated coarse particulate pollution associated with dust-generating activity",
        "impact": "Expected 12-18% reduction in local PM10 exposure",
    },
    "Industrial emissions": {
        "action": "Inspect industrial units and verify stack-emission compliance",
        "department": "State Pollution Control Board",
        "reason": "The attribution indicates an industrial combustion signature, including elevated SO2 risk",
        "impact": "Expected 15-20% reduction in controllable industrial emissions after compliance action",
    },
    "Waste burning / fine particulate accumulation": {
        "action": "Deploy anti-burning patrols, remove waste accumulation, and intensify local PM2.5 monitoring",
        "department": "Municipal Sanitation Department and Pollution Control Board",
        "reason": "The attribution indicates fine particulate buildup consistent with local burning or accumulated combustion emissions",
        "impact": "Expected 8-12% reduction in neighbourhood PM2.5 exposure",
    },
    "Meteorological stagnation": {
        "action": "Issue a public health alert and deploy mobile monitoring units",
        "department": "Public Health Department and City Emergency Operations Centre",
        "reason": "Low-dispersion conditions can sustain elevated AQI across multiple zones",
        "impact": "Improves exposure avoidance and provides street-level evidence until dispersion recovers",
    },
}


def recommendation_engine(zone: dict[str, Any]) -> list[dict[str, Any]]:
    attribution = source_attribution(zone)
    source = attribution["main_source"]
    rule = ACTION_RULES[source]
    peak_aqi = max(
        as_float(zone.get("current_aqi")),
        as_float(zone.get("predicted_aqi_24h")),
        as_float(zone.get("predicted_aqi_48h")),
        as_float(zone.get("predicted_aqi_72h")),
    )
    score = 95 if peak_aqi > 400 else 85 if peak_aqi > 300 else 72 if peak_aqi > 200 else 55 if peak_aqi > 100 else 35
    if zone.get("trend") == "Worsening":
        score += 5
    if zone.get("_sensitive_zone") and peak_aqi > 300:
        score += 5
    score = min(score, 100)

    recommendations = [
        {
            "priority": priority_for(peak_aqi),
            "priority_score": score,
            "zone": zone.get("zone", "Unknown zone"),
            "action": rule["action"],
            "department": rule["department"],
            "reason": f"{rule['reason']}. Attribution confidence: {attribution['confidence']}%.",
            "expected_impact": rule["impact"],
            "status": "Recommended",
        }
    ]

    if peak_aqi > 400 and zone.get("_sensitive_zone"):
        recommendations.append(
            {
                "priority": "Critical",
                "priority_score": 100,
                "zone": zone.get("zone", "Unknown zone"),
                "action": "Issue an immediate school and hospital advisory and suspend strenuous outdoor activity",
                "department": "District Administration and Public Health Department",
                "reason": f"Peak AQI {peak_aqi:.0f} is Severe in a sensitive zone",
                "expected_impact": "Immediately reduces exposure for children, patients, and other high-risk groups",
                "status": "Immediate action required",
            }
        )
    return recommendations


def actions() -> list[dict[str, Any]]:
    return [recommendation for zone in build_zones() for recommendation in recommendation_engine(zone)]


def reports() -> list[dict[str, Any]]:
    def metric_value(value: Any, default: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    return [
        {
            "forecast": row.get("Forecast", "Unknown"),
            "rmse": metric_value(row.get("RMSE")),
            "mae": metric_value(row.get("MAE")),
            "r2": metric_value(row.get("R2")),
            "baseline_rmse": metric_value(row.get("Baseline RMSE")),
            "improvement_percentage": metric_value(row.get("Improvement %")),
            "confidence": metric_value(row.get("Confidence"), 60.0),
            "model_name": row.get("Best Model", "Unknown"),
        }
        for row in store.metrics
    ]


def find_zone(zone_name: str) -> dict[str, Any] | None:
    normalized = zone_name.strip().casefold()
    for zone in build_zones():
        if normalized in {zone["zone"].casefold(), zone["id"].casefold(), zone["city"].casefold()}:
            return zone
    return None
