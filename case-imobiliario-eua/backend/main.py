from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from services.fred_service import SERIES_METADATA, get_series, get_story_data, get_summary


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

app = FastAPI(
    title="Case Imobiliario EUA - Observatorio FIESC",
    version="0.1.0",
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "series": list(SERIES_METADATA)}


@app.get("/api/series/{code}")
def series(code: str, refresh: bool = Query(False)) -> dict:
    try:
        return get_series(code, refresh=refresh)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Falha ao carregar serie {code}") from exc


@app.get("/api/story-data")
def story_data(refresh: bool = Query(False)) -> dict:
    try:
        return get_story_data(refresh=refresh)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Falha ao carregar dados do case") from exc


@app.get("/api/summary")
def summary(refresh: bool = Query(False)) -> dict:
    try:
        return get_summary(refresh=refresh)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Falha ao carregar resumo") from exc
