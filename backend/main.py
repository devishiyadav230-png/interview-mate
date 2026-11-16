"""Interview Mate backend: FastAPI + MediaPipe + OpenCV + NumPy.
Run:  uvicorn main:app --reload      (from the backend folder)
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import analyzer
import ai_routes

app = FastAPI(title="Interview Mate API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


app.include_router(ai_routes.router)   # AI Interviewer (LLM mode is optional)


class FrameIn(BaseModel):
    session: str
    image: str          # data URL (JPEG) from the browser canvas


class SummaryIn(BaseModel):
    frames: list[dict]  # list of analyze-frame results for one answer


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/analyze-frame")
def analyze_frame(body: FrameIn):
    return analyzer.analyze_frame(body.session, body.image)


@app.post("/api/summarize")
def summarize(body: SummaryIn):
    return analyzer.summarize(body.frames)


# Serve the frontend from the same server -> open http://127.0.0.1:8000
FRONTEND = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")
