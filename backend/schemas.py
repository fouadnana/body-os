from __future__ import annotations
from pydantic import BaseModel, Field

class FoodItem(BaseModel):
    name: str
    qty: float = Field(ge=0)
    unit: str = " g"
    kcal: float = Field(ge=0)
    protein: float = Field(ge=0)
    carbs: float = Field(ge=0)
    fat: float = Field(ge=0)
    confidence: float = Field(ge=0, le=1)

class FoodVisionResponse(BaseModel):
    confidence: float = Field(ge=0, le=1)
    foods: list[FoodItem]
    warnings: list[str] = []
    needs_user_review: bool = True
