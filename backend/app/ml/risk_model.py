"""
Runtime wrapper around the trained supervised risk model + the unsupervised
behavioral (Isolation Forest) model. Loads artifacts produced by train.py.

Fail-safe behavior: if artifacts are missing/unloadable, this module falls
back to a conservative fixed score (see FALLBACK_RISK_SCORE) rather than
crashing the request path — matching the "ML unavailable -> conservative
policy" rule in the production-mindset section of the brief.
"""
from __future__ import annotations
import os
from typing import Optional

import joblib
import numpy as np

from backend.app.ml.features import FEATURE_COLUMNS, build_feature_row

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
FALLBACK_RISK_SCORE = 0.6  # conservative-but-not-auto-block if the model can't load


class RiskModel:
    def __init__(self, artifact_dir: str = ARTIFACT_DIR):
        self.available = False
        self.model = None
        self.scaler = None
        self.model_name = "unavailable"
        self.version = "unavailable"
        self.behavioral_model = None
        self._load(artifact_dir)

    def _load(self, artifact_dir: str):
        try:
            risk_path = os.path.join(artifact_dir, "risk_model.joblib")
            beh_path = os.path.join(artifact_dir, "behavioral_model.joblib")
            bundle = joblib.load(risk_path)
            self.model = bundle["model"]
            self.scaler = bundle["scaler"]
            self.model_name = bundle["model_name"]
            self.version = bundle["version"]
            beh_bundle = joblib.load(beh_path)
            self.behavioral_model = beh_bundle["model"]
            self.available = True
        except Exception:
            self.available = False

    def _vectorize(self, feature_row: dict) -> np.ndarray:
        import pandas as pd
        df = pd.DataFrame([{c: feature_row[c] for c in FEATURE_COLUMNS}])
        return self.scaler.transform(df)

    def score(self, event: dict) -> dict:
        feature_row = build_feature_row(event)
        if not self.available:
            return {
                "risk_score": FALLBACK_RISK_SCORE,
                "behavioral_anomaly": True,
                "model_version": self.version,
                "model_name": self.model_name,
                "features": feature_row,
                "fallback": True,
            }
        vec = self._vectorize(feature_row)
        risk_score = float(self.model.predict_proba(vec)[:, 1][0])
        beh_flag = bool(self.behavioral_model.predict(vec)[0] == -1)
        return {
            "risk_score": risk_score,
            "behavioral_anomaly": beh_flag,
            "model_version": self.version,
            "model_name": self.model_name,
            "features": feature_row,
            "fallback": False,
        }


_singleton: Optional[RiskModel] = None


def get_risk_model() -> RiskModel:
    global _singleton
    if _singleton is None:
        _singleton = RiskModel()
    return _singleton
