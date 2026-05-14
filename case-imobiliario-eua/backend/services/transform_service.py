from __future__ import annotations

from datetime import date, timedelta

import pandas as pd


def moving_average_12m(records: list[dict]) -> list[dict]:
    df = _records_to_frame(records)
    df["value"] = df["value"].rolling(window=12, min_periods=6).mean()
    return _frame_to_records(df)


def yoy_change(records: list[dict]) -> list[dict]:
    df = _records_to_frame(records)
    dates = pd.to_datetime(df["date"])
    median_gap = dates.diff().dt.days.median()
    periods = 52 if median_gap and median_gap <= 10 else 12 if median_gap and median_gap <= 40 else 4
    df["value"] = df["value"].pct_change(periods=periods) * 100
    return _frame_to_records(df)


def index_base_100(records: list[dict]) -> list[dict]:
    df = _records_to_frame(records)
    first_value = df["value"].dropna().iloc[0] if df["value"].notna().any() else None
    if first_value:
        df["value"] = df["value"] / first_value * 100
    return _frame_to_records(df)


def latest_value(records: list[dict]) -> dict | None:
    valid = [record for record in records if record.get("value") is not None]
    return valid[-1] if valid else None


def filter_period(records: list[dict], period: str) -> list[dict]:
    if period == "all":
        return records

    today = date.today()
    if period == "2018":
        start = date(2018, 1, 1)
    elif period == "2020":
        start = date(2020, 1, 1)
    elif period == "5y":
        start = today - timedelta(days=365 * 5)
    else:
        return records

    return [record for record in records if date.fromisoformat(record["date"]) >= start]


def add_derived_fields(records: list[dict]) -> list[dict]:
    df = _records_to_frame(records)
    dates = pd.to_datetime(df["date"])
    median_gap = dates.diff().dt.days.median()
    yoy_periods = 52 if median_gap and median_gap <= 10 else 12 if median_gap and median_gap <= 40 else 4
    df["yoy_change"] = df["value"].pct_change(periods=yoy_periods) * 100
    df["ma12"] = df["value"].rolling(window=12, min_periods=6).mean()
    return _frame_to_records(df, include_extra=True)


def summarize_series(records: list[dict], unit: str) -> dict:
    enriched = add_derived_fields(records)
    latest = latest_value(enriched)
    if not latest:
        return {"latest_value": None, "latest_date": None, "yoy_change": None, "unit": unit}
    return {
        "latest_value": latest.get("value"),
        "latest_date": latest.get("date"),
        "yoy_change": latest.get("yoy_change"),
        "unit": unit,
    }


def _records_to_frame(records: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(records)
    if df.empty:
        return pd.DataFrame({"date": [], "value": []})
    df["date"] = pd.to_datetime(df["date"])
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    return df.sort_values("date").reset_index(drop=True)


def _frame_to_records(df: pd.DataFrame, include_extra: bool = False) -> list[dict]:
    output = df.copy()
    output["date"] = pd.to_datetime(output["date"]).dt.strftime("%Y-%m-%d")
    columns = ["date", "value"]
    if include_extra:
        columns.extend([column for column in ["yoy_change", "ma12"] if column in output.columns])
    output = output[columns].where(pd.notnull(output), None)
    return output.to_dict(orient="records")
