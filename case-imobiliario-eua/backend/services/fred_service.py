from __future__ import annotations

import os
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

import pandas as pd
import requests

from services.transform_service import add_derived_fields, summarize_series


try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BASE_DIR.parents[0]
CACHE_DIR = BASE_DIR / "cache" / "fred"
LOCAL_PROCESSED_DIR = PROJECT_DIR.parent / "data" / "processed"
FRED_GRAPH_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv"
FRED_SERIES_URL = "https://api.stlouisfed.org/fred/series"

OBSERVATION_START = "2000-01-01"

SERIES_METADATA = {
    "MORTGAGE30US": {
        "code": "MORTGAGE30US",
        "label": "Taxa hipotecaria fixa de 30 anos",
        "description": "Taxa media das hipotecas fixas de 30 anos nos Estados Unidos.",
        "unit": "%",
        "frequency": "semanal",
        "transformation": "nivel",
        "source": "FRED / Freddie Mac",
    },
    "RCMFLOORIG": {
        "code": "RCMFLOORIG",
        "label": "Originacao de novas hipotecas",
        "description": "Volume de novas hipotecas originadas no mercado residencial.",
        "unit": "US$ bi",
        "frequency": "trimestral",
        "transformation": "nivel e variacao interanual",
        "source": "FRED",
    },
    "HOUSTNSA": {
        "code": "HOUSTNSA",
        "label": "Novas casas iniciadas, total",
        "description": "Novas unidades habitacionais iniciadas nos EUA.",
        "unit": "mil unidades",
        "frequency": "mensal",
        "transformation": "media movel de 12 meses",
        "source": "FRED / U.S. Census Bureau",
    },
    "HOUST1FNSA": {
        "code": "HOUST1FNSA",
        "label": "Novas casas iniciadas unifamiliares",
        "description": "Novas unidades unifamiliares iniciadas nos EUA.",
        "unit": "mil unidades",
        "frequency": "mensal",
        "transformation": "media movel de 12 meses",
        "source": "FRED / U.S. Census Bureau",
    },
    "COMPUTSA": {
        "code": "COMPUTSA",
        "label": "Novas unidades habitacionais concluidas",
        "description": "Unidades habitacionais concluidas, taxa anualizada ajustada sazonalmente.",
        "unit": "mil unidades",
        "frequency": "mensal",
        "transformation": "nivel",
        "source": "FRED / U.S. Census Bureau",
    },
    "MSACSR": {
        "code": "MSACSR",
        "label": "Oferta de novas casas em meses",
        "description": "Meses de oferta de novas casas a venda.",
        "unit": "meses",
        "frequency": "mensal",
        "transformation": "nivel",
        "source": "FRED / U.S. Census Bureau",
    },
}


def get_series(code: str, refresh: bool = False) -> dict:
    normalized_code = code.upper()
    if normalized_code not in SERIES_METADATA:
        raise KeyError(f"Serie nao mapeada: {code}")

    records = _load_series_records(normalized_code, refresh=refresh)
    metadata = _metadata_with_fred(normalized_code)
    return {
        "code": normalized_code,
        "name": metadata["label"],
        "source": metadata["source"],
        "frequency": metadata["frequency"],
        "unit": metadata["unit"],
        "last_updated": metadata.get("last_updated"),
        "description": metadata["description"],
        "transformation": metadata["transformation"],
        "data": add_derived_fields(records),
    }


def get_story_data(refresh: bool = False) -> dict:
    series = {}
    metadata = {}
    errors = {}
    for code in SERIES_METADATA:
        try:
            payload = get_series(code, refresh=refresh)
            series[code] = payload["data"]
            metadata[code] = {key: value for key, value in payload.items() if key != "data"}
        except Exception as exc:
            series[code] = []
            fallback_metadata = SERIES_METADATA[code].copy()
            fallback_metadata["last_updated"] = None
            metadata[code] = fallback_metadata
            errors[code] = "Serie indisponivel no momento."

    return {
        "series": series,
        "metadata": metadata,
        "errors": errors,
        "last_updated": datetime.now(timezone.utc).date().isoformat(),
    }


def get_summary(refresh: bool = False) -> dict:
    summary = {}
    for code, metadata in SERIES_METADATA.items():
        try:
            records = _load_series_records(code, refresh=refresh)
            summary[code] = summarize_series(records, metadata["unit"])
        except Exception:
            summary[code] = {
                "latest_value": None,
                "latest_date": None,
                "yoy_change": None,
                "unit": metadata["unit"],
            }
    return summary


def _load_series_records(code: str, refresh: bool = False) -> list[dict]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / f"{code}.parquet"

    if cache_path.exists() and not refresh:
        return _frame_to_records(pd.read_parquet(cache_path))

    try:
        df = _fetch_from_fred_graph(code)
        df.to_parquet(cache_path, index=False)
        return _frame_to_records(df)
    except Exception:
        if cache_path.exists():
            return _frame_to_records(pd.read_parquet(cache_path))

        local = _load_from_processed_csv(code)
        if local is not None:
            local.to_parquet(cache_path, index=False)
            return _frame_to_records(local)

        raise


def _fetch_from_fred_graph(code: str) -> pd.DataFrame:
    response = requests.get(FRED_GRAPH_URL, params={"id": code}, timeout=30)
    response.raise_for_status()
    df = pd.read_csv(StringIO(response.text))
    df = df.rename(columns={"observation_date": "date", "DATE": "date", code: "value"})
    df["date"] = pd.to_datetime(df["date"])
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df = df[df["date"] >= pd.to_datetime(OBSERVATION_START)]
    return df[["date", "value"]].dropna(subset=["date"]).reset_index(drop=True)


def _load_from_processed_csv(code: str) -> pd.DataFrame | None:
    csv_path = LOCAL_PROCESSED_DIR / "fred_housing_series_long.csv"
    if not csv_path.exists():
        return None

    df = pd.read_csv(csv_path)
    df = df[df["serie"] == code].rename(columns={"data": "date", "valor": "value"})
    if df.empty:
        return None

    df["date"] = pd.to_datetime(df["date"])
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    return df[["date", "value"]].dropna(subset=["date"]).reset_index(drop=True)


def _metadata_with_fred(code: str) -> dict:
    metadata = SERIES_METADATA[code].copy()
    api_key = os.getenv("FRED_API_KEY")
    if not api_key:
        return metadata

    try:
        response = requests.get(
            FRED_SERIES_URL,
            params={"series_id": code, "api_key": api_key, "file_type": "json"},
            timeout=20,
        )
        response.raise_for_status()
        series = response.json().get("seriess", [])
        if series:
            metadata["last_updated"] = series[0].get("last_updated")
            metadata["fred_title"] = series[0].get("title")
    except Exception:
        metadata["last_updated"] = None

    return metadata


def _frame_to_records(df: pd.DataFrame) -> list[dict]:
    output = df.copy()
    output["date"] = pd.to_datetime(output["date"]).dt.strftime("%Y-%m-%d")
    output["value"] = pd.to_numeric(output["value"], errors="coerce")
    output = output.where(pd.notnull(output), None)
    return output[["date", "value"]].to_dict(orient="records")
