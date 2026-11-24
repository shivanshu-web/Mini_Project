import joblib
import numpy as np
import pandas as pd
from pathlib import Path

# 1. Load the saved Pipeline
MODEL_PATH = Path(__file__).parent / "model" / "laptop_price_prediction_final.pkl"
pipeline = joblib.load(MODEL_PATH)

def compute_display_features(resolution: str, screen_size: float):
    x_res, y_res = map(int, resolution.lower().split("x"))
    ppi = ((x_res ** 2 + y_res ** 2) ** 0.5) / screen_size
    is_4k = 1 if (x_res >= 3840 or y_res >= 2160) else 0
    return round(ppi, 2), is_4k

# 2. Sample laptop input (Dell Notebook, Core i5, 8GB RAM, 512GB SSD, 15.6" FHD, Windows)
resolution = "1920x1080"
screen_size = 15.6
ppi, is_4k = compute_display_features(resolution, screen_size)

sample_input = pd.DataFrame([{
    "Company": "Dell",
    "TypeName": "Notebook",
    "Ram": 8,
    "Gpu": "Intel",
    "OpSys": "Windows",
    "4K": is_4k,
    "PPI": ppi,
    "Cpu_brand": "Intel Core i5",
    "SSD": 512
}])

# 3. Predict log-price and convert back to Indian Rupees
log_price = pipeline.predict(sample_input)[0]
predicted_inr = float(np.exp(log_price))

print(f"Computed Display Features -> PPI: {ppi}, 4K: {is_4k}")
print(f"Raw Log Prediction: {log_price:.4f}")
print(f"Estimated Price: ₹{predicted_inr:,.2f}")