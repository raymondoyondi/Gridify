"""Train a minimal scikit-learn model and save it to disk.

Usage:
  python -m models.train_model --out models/model.joblib

This trains a small classifier on synthetic data and saves a Pipeline with a scaler
and a LogisticRegression model using joblib.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import numpy as np
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


def train(n_samples: int = 1000, random_state: int = 42):
    X, y = make_classification(
        n_samples=n_samples,
        n_features=10,
        n_informative=6,
        n_redundant=2,
        n_classes=2,
        random_state=random_state,
    )
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(max_iter=1000, random_state=random_state)),
    ])
    pipeline.fit(X, y)
    return pipeline


def main():
    parser = argparse.ArgumentParser(description="Train and save a scikit-learn model.")
    parser.add_argument("--out", default="models/model.joblib", help="Output path for the model")
    parser.add_argument("--n-samples", type=int, default=1000)
    parser.add_argument("--random-state", type=int, default=42)
    args = parser.parse_args()

    model = train(n_samples=args.n_samples, random_state=args.random_state)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, out_path)
    print(f"Saved model to {out_path}")


if __name__ == "__main__":
    main()
