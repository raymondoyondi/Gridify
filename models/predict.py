"""Load a saved joblib model and run predictions on CSV input.

Usage:
  python -m models.predict --model models/model.joblib --input data.csv --output predictions.csv

The input CSV should contain feature columns (no header enforcement here). If the model expects
named columns you can pre-process accordingly. This script is intentionally minimal and meant
for local testing and demos.
"""
from __future__ import annotations

import argparse
from pathlib import Path
import joblib
import pandas as pd


def predict_from_csv(model_path: str, input_csv: str, output_csv: str | None = None, probs: bool = False):
    model = joblib.load(model_path)
    df = pd.read_csv(input_csv)

    # If dataframe has more columns than the model expects, this will work if the model
    # was trained on the first N columns of a numeric array. For more robust usage,
    # preprocess to match training features.
    X = df.values
    preds = model.predict(X)

    result = df.copy()
    result["prediction"] = preds
    if probs and hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)
        # store probability for class 1
        result["probability"] = proba[:, 1]

    if output_csv:
        Path(output_csv).parent.mkdir(parents=True, exist_ok=True)
        result.to_csv(output_csv, index=False)
        print(f"Wrote predictions to {output_csv}")
    else:
        print(result.head())


def main():
    parser = argparse.ArgumentParser(description="Run predictions using a saved model")
    parser.add_argument("--model", default="models/model.joblib", help="Path to joblib model file")
    parser.add_argument("--input", required=True, help="Input CSV file path")
    parser.add_argument("--output", help="Optional output CSV path")
    parser.add_argument("--probs", action="store_true", help="Include class 1 probability if available")
    args = parser.parse_args()

    predict_from_csv(args.model, args.input, args.output, args.probs)


if __name__ == "__main__":
    main()
