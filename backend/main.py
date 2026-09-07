from __future__ import annotations

import io
import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from PIL import Image

from schemas import FoodVisionResponse

load_dotenv()
MODEL = os.getenv("BODY_OS_VISION_MODEL", "gemini-2.5-flash-lite")
MAX_IMAGE_MB = float(os.getenv("BODY_OS_MAX_IMAGE_MB", "8"))
ALLOWED_ORIGINS = [
    x.strip()
    for x in os.getenv(
        "BODY_OS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if x.strip()
]

app = FastAPI(title="BODY OS Food Vision", version="10.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

INSTRUCTION = """You are BODY OS Food Vision, a conservative meal-estimation engine.
Analyze only what is reasonably visible in the meal photo. Estimate each visible food item and approximate edible portion in grams, kcal, protein, carbohydrates and fat. Do not invent hidden ingredients. Oils, sauces, dressings and cooking fats are uncertain: lower confidence and add warnings. Prefer separate food components where possible. confidence must be between 0 and 1. needs_user_review must always be true because photo-based nutrition is an estimate. Return food names in French when possible."""


def _prepare(raw: bytes) -> bytes:
    if len(raw) > MAX_IMAGE_MB * 1024 * 1024:
        raise HTTPException(413, f"Image trop volumineuse (max {MAX_IMAGE_MB:g} Mo).")
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except Exception as exc:
        raise HTTPException(400, "Image invalide.") from exc

    img = img.convert("RGB")
    img.thumbnail((1600, 1600))
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue()


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "BODY OS Food Vision",
        "status": "online",
        "version": "10.2",
        "provider": "Gemini",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": MODEL, "provider": "Gemini"}


@app.post("/api/food-vision", response_model=FoodVisionResponse)
async def food_vision(image: UploadFile = File(...)) -> FoodVisionResponse:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(503, "GEMINI_API_KEY absente côté serveur.")

    normalized = _prepare(await image.read())
    image_part = types.Part.from_bytes(data=normalized, mime_type="image/jpeg")

    try:
        client = genai.Client(api_key=key)
        response = client.models.generate_content(
            model=MODEL,
            contents=[
                INSTRUCTION,
                "Analyse ce repas et retourne uniquement la structure JSON demandée.",
                image_part,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=FoodVisionResponse,
            ),
        )
        if not response.text:
            raise ValueError("Réponse Gemini vide")
        payload = json.loads(response.text)
        payload["needs_user_review"] = True
        return FoodVisionResponse.model_validate(payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            502,
            "L'analyse Food Vision a échoué. Réessaie avec une photo plus nette.",
        ) from exc
