#!/usr/bin/env python3
"""Train a small scikit-learn model and save it to models/model.joblib"""
import os
from pathlib import Path
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor

OUTPUT = Path('models')
OUTPUT.mkdir(parents=True, exist_ok=True)

# synthetic data
X = np.random.randn(200, 5)
y = X @ np.array([1.2, -0.7, 0.3, 0.0, 0.5]) + np.random.randn(200) * 0.1

model = RandomForestRegressor(n_estimators=50, random_state=42)
model.fit(X, y)

joblib.dump(model, OUTPUT / 'model.joblib')
print(f"Saved model to {OUTPUT / 'model.joblib'}")
