from pathlib import Path
from typing import Literal
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator

app = FastAPI(
    title="Laptop Price Prediction ML Service",
    description="Internal inference microservice for predicting laptop prices in INR.",
    version="1.0.0",
)

# Load trained Scikit-Learn Pipeline once at startup
MODEL_PATH = Path(__file__).parent / "model" / "laptop_price_prediction_final.pkl"
try:
    pipeline = joblib.load(MODEL_PATH)
except Exception as exc:
    raise RuntimeError(f"Failed to load ML model from {MODEL_PATH}: {exc}") from exc


# Extract exact categories learned by OneHotEncoder during training
ohe = pipeline.named_steps["step1"].named_transformers_["ohe"]
CATEGORICAL_COLUMNS = ["Company", "TypeName", "Gpu", "OpSys", "Cpu_brand"]
LEARNED_CATEGORIES = {
    col: [str(val) for val in cats]
    for col, cats in zip(CATEGORICAL_COLUMNS, ohe.categories_)
}


class LaptopSpecsRequest(BaseModel):
    company: str = Field(..., example="Dell")
    type_name: str = Field(..., example="Notebook")
    ram: int = Field(..., ge=2, le=128, example=8)
    gpu: str = Field(..., example="Intel")
    op_sys: str = Field(..., example="Windows")
    cpu_brand: str = Field(..., example="Intel Core i5")
    ssd: int = Field(..., ge=0, le=8192, example=512)
    screen_size: float = Field(..., gt=8.0, lt=25.0, example=15.6)
    resolution: str = Field(..., example="1920x1080")

    @field_validator("resolution")
    @classmethod
    def validate_resolution(cls, value: str) -> str:
        parts = value.lower().strip().split("x")
        if len(parts) != 2 or not all(p.isdigit() and int(p) > 0 for p in parts):
            raise ValueError("Resolution must be in 'WIDTHxHEIGHT' format, e.g., '1920x1080'")
        return f"{int(parts[0])}x{int(parts[1])}"


class PredictionResponse(BaseModel):
    estimated_price_inr: float
    formatted_price_inr: str
    computed_features: dict


def compute_display_features(resolution: str, screen_size: float) -> tuple[float, int]:
    x_res, y_res = map(int, resolution.split("x"))
    ppi = ((x_res ** 2 + y_res ** 2) ** 0.5) / screen_size
    is_4k = 1 if (x_res >= 3840 or y_res >= 2160) else 0
    return round(ppi, 2), is_4k

@app.get("/")
# def root():
#     return {
#         "service": "Laptop Price Prediction ML API",
#         "docs": "Visit http://127.0.0.1:8000/docs to test endpoints interactively"
#     }
@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": True}


@app.get("/metadata")
def get_model_metadata():
    """Returns exact dropdown options extracted from the trained OneHotEncoder."""
    return {
        "categories": LEARNED_CATEGORIES,
        "numeric_options": {
            "ram": [4, 8, 12, 16, 24, 32, 64],
            "ssd": [0, 128, 256, 512, 1024, 2048],
            "resolutions": [
                "1366x768",
                "1600x900",
                "1920x1080",
                "1920x1200",
                "2256x1504",
                "2560x1440",
                "2560x1600",
                "2880x1800",
                "3200x1800",
                "3840x2160",
            ],
        },
    }


@app.post("/predict", response_model=PredictionResponse)
def predict_price(specs: LaptopSpecsRequest):
    try:
        ppi, is_4k = compute_display_features(specs.resolution, specs.screen_size)

        # Column names must match pipeline.feature_names_in_
        input_df = pd.DataFrame([{
            "Company": specs.company,
            "TypeName": specs.type_name,
            "Ram": specs.ram,
            "Gpu": specs.gpu,
            "OpSys": specs.op_sys,
            "4K": is_4k,
            "PPI": ppi,
            "Cpu_brand": specs.cpu_brand,
            "SSD": specs.ssd,
        }])

        log_price = float(pipeline.predict(input_df)[0])
        price_inr = round(float(np.exp(log_price)), 2)

        return PredictionResponse(
            estimated_price_inr=price_inr,
            formatted_price_inr=f"₹{price_inr:,.2f}",
            computed_features={"PPI": ppi, "4K": is_4k},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}") from exc