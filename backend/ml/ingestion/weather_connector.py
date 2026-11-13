"""
Open-Meteo Weather API Connector and Historical Climatology Integration.
Provides real-world weather data for ports and marine waypoints with offline fallback,
caching, and transparent source labeling.
"""

import time
from typing import Dict, Any, Optional
import requests
import json
import os

# Local cache for weather observations to avoid redundant requests and rate limits
WEATHER_CACHE_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "..",
    "data",
    "external",
    "weather_cache.json"
)

# Seasonal climatological baselines per region for fallback
REGIONAL_CLIMATOLOGY: Dict[str, Dict[str, float]] = {
    "East Asia": {"avg_wind_speed": 18.5, "avg_precipitation": 3.2, "storm_prob": 0.08},
    "Southeast Asia": {"avg_wind_speed": 14.0, "avg_precipitation": 6.8, "storm_prob": 0.12},
    "North America West Coast": {"avg_wind_speed": 16.0, "avg_precipitation": 2.1, "storm_prob": 0.05},
    "North America East Coast": {"avg_wind_speed": 19.2, "avg_precipitation": 3.5, "storm_prob": 0.09},
    "Northern Europe": {"avg_wind_speed": 24.5, "avg_precipitation": 4.1, "storm_prob": 0.15},
    "Middle East": {"avg_wind_speed": 15.0, "avg_precipitation": 0.2, "storm_prob": 0.02},
    "South Asia": {"avg_wind_speed": 17.5, "avg_precipitation": 5.4, "storm_prob": 0.14},
    "Mediterranean": {"avg_wind_speed": 16.5, "avg_precipitation": 1.8, "storm_prob": 0.04},
    "South America": {"avg_wind_speed": 15.8, "avg_precipitation": 3.9, "storm_prob": 0.06},
    "Default": {"avg_wind_speed": 18.0, "avg_precipitation": 3.0, "storm_prob": 0.07},
}


class WeatherConnector:
    """
    Connects to Open-Meteo Public API for real weather observations.
    Gracefully handles rate limits, offline environments, and network errors.
    """

    def __init__(self, timeout_seconds: float = 4.0):
        self.timeout = timeout_seconds
        self.cache: Dict[str, Dict[str, Any]] = self._load_cache()

    def _load_cache(self) -> Dict[str, Dict[str, Any]]:
        try:
            if os.path.exists(WEATHER_CACHE_FILE):
                with open(WEATHER_CACHE_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            pass
        return {}

    def _save_cache(self):
        try:
            os.makedirs(os.path.dirname(WEATHER_CACHE_FILE), exist_ok=True)
            with open(WEATHER_CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(self.cache, f, indent=2)
        except Exception:
            pass

    def calculate_weather_severity(self, wind_speed_kmh: float, precipitation_mm: float, gusts_kmh: float = 0.0) -> float:
        """
        Computes normalized weather severity index from 0.0 (calm) to 1.0 (severe storm / hurricane conditions).
        Based on Beaufort scale and maritime navigation disruption thresholds.
        """
        # Wind component: 0 km/h -> 0, 75+ km/h (gale force) -> 1.0
        wind_factor = min(wind_speed_kmh / 75.0, 1.0) * 0.55
        # Gust factor
        gust_factor = min(gusts_kmh / 95.0, 1.0) * 0.20
        # Precipitation factor: 0 mm -> 0, 25+ mm/hr -> 1.0
        precip_factor = min(precipitation_mm / 25.0, 1.0) * 0.25
        
        severity = wind_factor + gust_factor + precip_factor
        return round(min(max(severity, 0.0), 1.0), 3)

    def get_port_weather(
        self,
        port_code: str,
        latitude: float,
        longitude: float,
        region: str = "Default"
    ) -> Dict[str, Any]:
        """
        Retrieves real current weather from Open-Meteo for the port coordinate.
        Falls back to cache or climatological baseline if offline.
        """
        cache_key = f"{port_code}_{round(latitude, 2)}_{round(longitude, 2)}"
        now = time.time()

        # Check in-memory cache valid within 1 hour
        if cache_key in self.cache:
            entry = self.cache[cache_key]
            if now - entry.get("timestamp", 0) < 3600:
                result = dict(entry["data"])
                result["data_source"] = "cached_open_meteo"
                return result

        # Attempt live API call to Open-Meteo
        api_url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,precipitation,rain,wind_speed_10m,wind_gusts_10m",
            "timezone": "UTC"
        }

        try:
            response = requests.get(api_url, params=params, timeout=self.timeout)
            if response.status_code == 200:
                data = response.json().get("current", {})
                wind_speed = float(data.get("wind_speed_10m", 15.0))
                gusts = float(data.get("wind_gusts_10m", wind_speed * 1.25))
                precip = float(data.get("precipitation", 0.0))
                temp = float(data.get("temperature_2m", 20.0))
                severity = self.calculate_weather_severity(wind_speed, precip, gusts)

                weather_data = {
                    "port_code": port_code,
                    "latitude": latitude,
                    "longitude": longitude,
                    "temperature_c": temp,
                    "wind_speed_kmh": wind_speed,
                    "wind_gusts_kmh": gusts,
                    "precipitation_mm": precip,
                    "weather_severity_index": severity,
                    "data_source": "live_open_meteo_api",
                    "status": "success",
                    "is_storm_condition": severity > 0.45 or wind_speed > 45.0
                }

                # Save to cache
                self.cache[cache_key] = {"timestamp": now, "data": weather_data}
                self._save_cache()
                return weather_data
        except Exception:
            # Live API unavailable or network timeout; fallback
            pass

        # Fallback to regional climatological baseline
        climatology = REGIONAL_CLIMATOLOGY.get(region, REGIONAL_CLIMATOLOGY["Default"])
        wind = climatology["avg_wind_speed"]
        precip = climatology["avg_precipitation"]
        severity = self.calculate_weather_severity(wind, precip, wind * 1.2)

        return {
            "port_code": port_code,
            "latitude": latitude,
            "longitude": longitude,
            "temperature_c": 19.5,
            "wind_speed_kmh": wind,
            "wind_gusts_kmh": round(wind * 1.2, 1),
            "precipitation_mm": precip,
            "weather_severity_index": severity,
            "data_source": "regional_climatological_fallback",
            "status": "fallback_applied",
            "is_storm_condition": severity > 0.45
        }
