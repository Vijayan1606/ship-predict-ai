"""
Real-world port reference data, geographic coordinates, UN/LOCODEs,
and typical port operational parameters based on UNCTAD and World Bank CPPI data.
"""

from typing import Dict, Any, Tuple
import math

# Real-world ports database with verified UN/LOCODEs, coordinates, and World Bank CPPI benchmarks
PORTS_DATABASE: Dict[str, Dict[str, Any]] = {
    "CNSHA": {
        "code": "CNSHA",
        "name": "Port of Shanghai",
        "city": "Shanghai",
        "country": "China",
        "latitude": 31.2304,
        "longitude": 121.4737,
        "region": "East Asia",
        "cppi_rank_tier": "High Efficiency",
        "baseline_dwell_hours": 36.0,
        "congestion_factor_base": 1.15,
        "annual_teu_million": 47.3,
    },
    "SGSIN": {
        "code": "SGSIN",
        "name": "Port of Singapore",
        "city": "Singapore",
        "country": "Singapore",
        "latitude": 1.29027,
        "longitude": 103.851959,
        "region": "Southeast Asia",
        "cppi_rank_tier": "Very High Efficiency",
        "baseline_dwell_hours": 28.0,
        "congestion_factor_base": 1.10,
        "annual_teu_million": 39.0,
    },
    "CNNGB": {
        "code": "CNNGB",
        "name": "Port of Ningbo-Zhoushan",
        "city": "Ningbo",
        "country": "China",
        "latitude": 29.8683,
        "longitude": 121.544,
        "region": "East Asia",
        "cppi_rank_tier": "High Efficiency",
        "baseline_dwell_hours": 34.0,
        "congestion_factor_base": 1.12,
        "annual_teu_million": 33.3,
    },
    "CNSZX": {
        "code": "CNSZX",
        "name": "Port of Shenzhen (Yantian)",
        "city": "Shenzhen",
        "country": "China",
        "latitude": 22.5431,
        "longitude": 114.0579,
        "region": "East Asia",
        "cppi_rank_tier": "High Efficiency",
        "baseline_dwell_hours": 32.0,
        "congestion_factor_base": 1.14,
        "annual_teu_million": 30.0,
    },
    "KRPUS": {
        "code": "KRPUS",
        "name": "Port of Busan",
        "city": "Busan",
        "country": "South Korea",
        "latitude": 35.1796,
        "longitude": 129.0756,
        "region": "East Asia",
        "cppi_rank_tier": "High Efficiency",
        "baseline_dwell_hours": 30.0,
        "congestion_factor_base": 1.08,
        "annual_teu_million": 22.7,
    },
    "USLAX": {
        "code": "USLAX",
        "name": "Port of Los Angeles",
        "city": "Los Angeles",
        "country": "United States",
        "latitude": 33.7432,
        "longitude": -118.2673,
        "region": "North America West Coast",
        "cppi_rank_tier": "Moderate",
        "baseline_dwell_hours": 68.0,
        "congestion_factor_base": 1.35,
        "annual_teu_million": 10.6,
    },
    "USLGB": {
        "code": "USLGB",
        "name": "Port of Long Beach",
        "city": "Long Beach",
        "country": "United States",
        "latitude": 33.7701,
        "longitude": -118.1937,
        "region": "North America West Coast",
        "cppi_rank_tier": "Moderate",
        "baseline_dwell_hours": 64.0,
        "congestion_factor_base": 1.30,
        "annual_teu_million": 9.1,
    },
    "USNYC": {
        "code": "USNYC",
        "name": "Port of New York and New Jersey",
        "city": "New York",
        "country": "United States",
        "latitude": 40.6698,
        "longitude": -74.1568,
        "region": "North America East Coast",
        "cppi_rank_tier": "Moderate",
        "baseline_dwell_hours": 58.0,
        "congestion_factor_base": 1.25,
        "annual_teu_million": 8.9,
    },
    "USSAV": {
        "code": "USSAV",
        "name": "Port of Savannah",
        "city": "Savannah",
        "country": "United States",
        "latitude": 32.0809,
        "longitude": -81.0912,
        "region": "North America East Coast",
        "cppi_rank_tier": "Moderate-High",
        "baseline_dwell_hours": 48.0,
        "congestion_factor_base": 1.20,
        "annual_teu_million": 5.8,
    },
    "NLRTM": {
        "code": "NLRTM",
        "name": "Port of Rotterdam",
        "city": "Rotterdam",
        "country": "Netherlands",
        "latitude": 51.9244,
        "longitude": 4.4777,
        "region": "Northern Europe",
        "cppi_rank_tier": "High Efficiency",
        "baseline_dwell_hours": 38.0,
        "congestion_factor_base": 1.15,
        "annual_teu_million": 14.5,
    },
    "BEANR": {
        "code": "BEANR",
        "name": "Port of Antwerp-Bruges",
        "city": "Antwerp",
        "country": "Belgium",
        "latitude": 51.2194,
        "longitude": 4.4025,
        "region": "Northern Europe",
        "cppi_rank_tier": "High Efficiency",
        "baseline_dwell_hours": 40.0,
        "congestion_factor_base": 1.18,
        "annual_teu_million": 12.5,
    },
    "DEHAM": {
        "code": "DEHAM",
        "name": "Port of Hamburg",
        "city": "Hamburg",
        "country": "Germany",
        "latitude": 53.5511,
        "longitude": 9.9937,
        "region": "Northern Europe",
        "cppi_rank_tier": "Moderate-High",
        "baseline_dwell_hours": 44.0,
        "congestion_factor_base": 1.22,
        "annual_teu_million": 8.3,
    },
    "GBFXT": {
        "code": "GBFXT",
        "name": "Port of Felixstowe",
        "city": "Felixstowe",
        "country": "United Kingdom",
        "latitude": 51.9617,
        "longitude": 1.3513,
        "region": "Northern Europe",
        "cppi_rank_tier": "Moderate",
        "baseline_dwell_hours": 50.0,
        "congestion_factor_base": 1.24,
        "annual_teu_million": 4.0,
    },
    "AEJEA": {
        "code": "AEJEA",
        "name": "Port of Jebel Ali (Dubai)",
        "city": "Dubai",
        "country": "United Arab Emirates",
        "latitude": 24.9857,
        "longitude": 55.0273,
        "region": "Middle East",
        "cppi_rank_tier": "Very High Efficiency",
        "baseline_dwell_hours": 26.0,
        "congestion_factor_base": 1.09,
        "annual_teu_million": 14.0,
    },
    "MYPKG": {
        "code": "MYPKG",
        "name": "Port Klang",
        "city": "Port Klang",
        "country": "Malaysia",
        "latitude": 3.0,
        "longitude": 101.4,
        "region": "Southeast Asia",
        "cppi_rank_tier": "High Efficiency",
        "baseline_dwell_hours": 32.0,
        "congestion_factor_base": 1.12,
        "annual_teu_million": 13.7,
    },
    "MYTPP": {
        "code": "MYTPP",
        "name": "Port of Tanjung Pelepas",
        "city": "Johor",
        "country": "Malaysia",
        "latitude": 1.36,
        "longitude": 103.55,
        "region": "Southeast Asia",
        "cppi_rank_tier": "Very High Efficiency",
        "baseline_dwell_hours": 25.0,
        "congestion_factor_base": 1.07,
        "annual_teu_million": 10.5,
    },
    "LKCMB": {
        "code": "LKCMB",
        "name": "Port of Colombo",
        "city": "Colombo",
        "country": "Sri Lanka",
        "latitude": 6.95,
        "longitude": 79.85,
        "region": "South Asia",
        "cppi_rank_tier": "High Efficiency",
        "baseline_dwell_hours": 30.0,
        "congestion_factor_base": 1.14,
        "annual_teu_million": 7.2,
    },
    "INNSA": {
        "code": "INNSA",
        "name": "Jawaharlal Nehru Port (Nhava Sheva)",
        "city": "Navi Mumbai",
        "country": "India",
        "latitude": 18.95,
        "longitude": 72.95,
        "region": "South Asia",
        "cppi_rank_tier": "Moderate-High",
        "baseline_dwell_hours": 42.0,
        "congestion_factor_base": 1.20,
        "annual_teu_million": 6.0,
    },
    "JPYOK": {
        "code": "JPYOK",
        "name": "Port of Yokohama",
        "city": "Yokohama",
        "country": "Japan",
        "latitude": 35.4437,
        "longitude": 139.638,
        "region": "East Asia",
        "cppi_rank_tier": "Very High Efficiency",
        "baseline_dwell_hours": 27.0,
        "congestion_factor_base": 1.06,
        "annual_teu_million": 2.9,
    },
    "GRPIR": {
        "code": "GRPIR",
        "name": "Port of Piraeus",
        "city": "Athens/Piraeus",
        "country": "Greece",
        "latitude": 37.9429,
        "longitude": 23.6469,
        "region": "Mediterranean",
        "cppi_rank_tier": "High Efficiency",
        "baseline_dwell_hours": 32.0,
        "congestion_factor_base": 1.13,
        "annual_teu_million": 5.0,
    },
    "ESVLC": {
        "code": "ESVLC",
        "name": "Port of Valencia",
        "city": "Valencia",
        "country": "Spain",
        "latitude": 39.4589,
        "longitude": -0.3276,
        "region": "Mediterranean",
        "cppi_rank_tier": "High Efficiency",
        "baseline_dwell_hours": 35.0,
        "congestion_factor_base": 1.15,
        "annual_teu_million": 5.6,
    },
    "BRSSZ": {
        "code": "BRSSZ",
        "name": "Port of Santos",
        "city": "Santos",
        "country": "Brazil",
        "latitude": -23.9618,
        "longitude": -46.3322,
        "region": "South America",
        "cppi_rank_tier": "Moderate",
        "baseline_dwell_hours": 54.0,
        "congestion_factor_base": 1.28,
        "annual_teu_million": 4.8,
    }
}

# Real maritime route distances (nautical miles) between prominent shipping corridors
REAL_MARITIME_DISTANCES_NM: Dict[Tuple[str, str], float] = {
    ("CNSHA", "USLAX"): 5700.0,
    ("CNSHA", "USLGB"): 5710.0,
    ("CNSHA", "NLRTM"): 10550.0,
    ("CNSHA", "BEANR"): 10580.0,
    ("CNSHA", "DEHAM"): 10720.0,
    ("CNSHA", "AEJEA"): 5200.0,
    ("CNSHA", "SGSIN"): 2250.0,
    ("SGSIN", "NLRTM"): 8300.0,
    ("SGSIN", "AEJEA"): 3380.0,
    ("SGSIN", "USNYC"): 10100.0,
    ("SGSIN", "USLAX"): 7850.0,
    ("NLRTM", "USNYC"): 3420.0,
    ("NLRTM", "USSAV"): 3850.0,
    ("DEHAM", "USNYC"): 3580.0,
    ("AEJEA", "NLRTM"): 6250.0,
    ("AEJEA", "INNSA"): 1080.0,
    ("LKCMB", "SGSIN"): 1580.0,
    ("LKCMB", "NLRTM"): 7900.0,
    ("KRPUS", "USLAX"): 5240.0,
    ("CNSZX", "USLAX"): 6500.0,
    ("CNSZX", "NLRTM"): 9800.0,
    ("INNSA", "NLRTM"): 6600.0,
    ("BRSSZ", "NLRTM"): 5400.0,
    ("BRSSZ", "USNYC"): 4900.0,
}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two coordinates in kilometers."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def get_maritime_distance_nm(origin_code: str, dest_code: str) -> float:
    """
    Returns actual or maritime-adjusted nautical miles between two ports.
    If pair is known in pre-indexed shipping lanes, returns verified nautical distance.
    Otherwise, applies maritime routing circuity factor (~1.25x) over great-circle distance.
    """
    if (origin_code, dest_code) in REAL_MARITIME_DISTANCES_NM:
        return REAL_MARITIME_DISTANCES_NM[(origin_code, dest_code)]
    if (dest_code, origin_code) in REAL_MARITIME_DISTANCES_NM:
        return REAL_MARITIME_DISTANCES_NM[(dest_code, origin_code)]

    port1 = PORTS_DATABASE.get(origin_code)
    port2 = PORTS_DATABASE.get(dest_code)

    if not port1 or not port2:
        return 4500.0  # standard oceanic transit fallback

    km = haversine_distance_km(
        port1["latitude"], port1["longitude"], port2["latitude"], port2["longitude"]
    )
    # Convert km to nm (1 nm ~ 1.852 km) and apply maritime routing circuity factor ~1.28
    nm_great_circle = km / 1.852
    return round(nm_great_circle * 1.28, 1)
