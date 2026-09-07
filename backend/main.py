from __future__ import annotations
import base64, io, json, os
from typing import Any
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from PIL import Image
from schemas import FoodVisionResponse

load_dotenv()
MODEL = os.getenv("BODY_OS_VISION_MODEL", "gpt-5.6-luna")
MAX_IMAGE_MB = float(os.getenv("BODY_OS_MAX_IMAGE_MB", "8"))
ALLOWED_ORIGINS = [x.strip() for x in os.getenv(
    "BODY_OS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if x.strip()]

app = FastAPI(title="BODY OS Food Vision", version="10.0.0")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=False,
                   allow_methods=["GET","POST","OPTIONS"], allow_headers=["*"])

FOOD_SCHEMA: dict[str, Any] = {
    "type":"object","additionalProperties":False,
    "properties":{
        "confidence":{"type":"number","minimum":0,"maximum":1},
        "foods":{"type":"array","items":{
            "type":"object","additionalProperties":False,
            "properties":{
                "name":{"type":"string"},"qty":{"type":"number","minimum":0},"unit":{"type":"string"},
                "kcal":{"type":"number","minimum":0},"protein":{"type":"number","minimum":0},
                "carbs":{"type":"number","minimum":0},"fat":{"type":"number","minimum":0},
                "confidence":{"type":"number","minimum":0,"maximum":1}},
            "required":["name","qty","unit","kcal","protein","carbs","fat","confidence"]}},
        "warnings":{"type":"array","items":{"type":"string"}},
        "needs_user_review":{"type":"boolean"}},
    "required":["confidence","foods","warnings","needs_user_review"]}

INSTRUCTION = """You are BODY OS Food Vision, a conservative meal-estimation engine.
Analyze only what is reasonably visible in the meal photo. Estimate each visible food item and approximate edible portion in grams, kcal, protein, carbohydrates and fat. Do not invent hidden ingredients. Oils, sauces, dressings and cooking fats are uncertain: lower confidence and add warnings. Prefer separate food components where possible. confidence must be between 0 and 1. needs_user_review must always be true because photo-based nutrition is an estimate."""

def _prepare(raw: bytes) -> bytes:
    if len(raw) > MAX_IMAGE_MB * 1024 * 1024:
        raise HTTPException(413, f"Image trop volumineuse (max {MAX_IMAGE_MB:g} Mo).")
    try:
        img = Image.open(io.BytesIO(raw)); img.load()
    except Exception as exc:
        raise HTTPException(400, "Image invalide.") from exc
    img = img.convert("RGB"); img.thumbnail((1600,1600))
    out = io.BytesIO(); img.save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue()

@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "BODY OS Food Vision",
        "status": "online",
        "version": "10.1",
    }


@app.get("/health")
def health(): return {"status":"ok","model":MODEL}

@app.post("/api/food-vision", response_model=FoodVisionResponse)
async def food_vision(image: UploadFile = File(...)) -> FoodVisionResponse:
    key = os.getenv("OPENAI_API_KEY")
    if not key: raise HTTPException(503, "OPENAI_API_KEY absente côté serveur.")
    normalized = _prepare(await image.read())
    data_url = "data:image/jpeg;base64," + base64.b64encode(normalized).decode("ascii")
    try:
        response = OpenAI(api_key=key).responses.create(
            model=MODEL,
            input=[
                {"role":"developer","content":[{"type":"input_text","text":INSTRUCTION}]},
                {"role":"user","content":[
                    {"type":"input_text","text":"Analyse ce repas et retourne uniquement la structure demandée."},
                    {"type":"input_image","image_url":data_url,"detail":"high"}
                ]}
            ],
            text={"format":{"type":"json_schema","name":"body_os_food_vision","strict":True,"schema":FOOD_SCHEMA}}
        )
        payload = json.loads(response.output_text)
        payload["needs_user_review"] = True
        return FoodVisionResponse.model_validate(payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(502, "L'analyse Food Vision a échoué. Réessaie avec une photo plus nette.") from exc
