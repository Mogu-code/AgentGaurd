"""
Train + evaluate candidate risk models on a held-out test set, compare against
a naive threshold baseline, and persist the winning model + real metrics.

Run:
    python -m backend.app.ml.train --data data/synthetic_events.csv \
        --out backend/app/ml/artifacts

This script does NOT fabricate numbers. Whatever it prints/saves is computed
from the actual train/val/test split at run time.
"""
import argparse
import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    confusion_matrix, classification_report,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
from backend.app.ml.features import FEATURE_COLUMNS, TARGET_COLUMN, select_features  # noqa: E402


def naive_baseline_predict(df: pd.DataFrame) -> np.ndarray:
    """Simple threshold baseline: flag if amount deviates >2x from user's
    historical average OR merchant is unknown. This is what a team would ship
    WITHOUT any ML — used to prove the ML model earns its place."""
    return ((df["amount_dev_ratio"] > 2.0) | (df["merchant_known"] == 0)).astype(int).values


def evaluate(name, y_true, y_pred, y_score=None):
    metrics = {
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
    }
    if y_score is not None:
        try:
            metrics["roc_auc"] = float(roc_auc_score(y_true, y_score))
        except ValueError:
            metrics["roc_auc"] = None
    cm = confusion_matrix(y_true, y_pred).tolist()
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    metrics["confusion_matrix"] = {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}
    metrics["false_positive_rate"] = float(fp / (fp + tn)) if (fp + tn) else 0.0
    metrics["false_negative_rate"] = float(fn / (fn + tp)) if (fn + tp) else 0.0
    print(f"\n=== {name} ===")
    print(json.dumps(metrics, indent=2))
    return metrics


def financial_impact(df_test, y_true, y_pred):
    """₹ value correctly blocked vs ₹ value of legitimate txns incorrectly blocked."""
    amounts = df_test["amount"].values
    blocked_correctly = amounts[(y_pred == 1) & (y_true == 1)].sum()
    blocked_incorrectly = amounts[(y_pred == 1) & (y_true == 0)].sum()
    missed = amounts[(y_pred == 0) & (y_true == 1)].sum()
    return {
        "value_correctly_blocked_inr": round(float(blocked_correctly), 2),
        "value_incorrectly_blocked_inr_fp_cost": round(float(blocked_incorrectly), 2),
        "value_missed_inr_fn_cost": round(float(missed), 2),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/synthetic_events.csv")
    ap.add_argument("--out", default="backend/app/ml/artifacts")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    df = pd.read_csv(args.data)

    X = select_features(df)
    y = df[TARGET_COLUMN].values

    # 60/20/20 stratified split. Scaler fit on TRAIN ONLY (no leakage).
    X_train, X_temp, y_train, y_temp, df_train, df_temp = train_test_split(
        X, y, df, test_size=0.4, stratify=y, random_state=42
    )
    X_val, X_test, y_val, y_test, df_val, df_test = train_test_split(
        X_temp, y_temp, df_temp, test_size=0.5, stratify=y_temp, random_state=42
    )

    scaler = StandardScaler().fit(X_train)
    X_train_s = scaler.transform(X_train)
    X_val_s = scaler.transform(X_val)
    X_test_s = scaler.transform(X_test)

    results = {}

    # Baseline (no ML)
    baseline_pred = naive_baseline_predict(df_test)
    results["naive_threshold_baseline"] = evaluate("Naive threshold baseline (no ML)", y_test, baseline_pred)
    results["naive_threshold_baseline"]["financial"] = financial_impact(df_test, y_test, baseline_pred)

    # Candidate 1: Logistic Regression
    lr = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)
    lr.fit(X_train_s, y_train)
    lr_val_pred = lr.predict(X_val_s)
    lr_test_pred = lr.predict(X_test_s)
    lr_test_score = lr.predict_proba(X_test_s)[:, 1]
    results["logistic_regression"] = evaluate("Logistic Regression", y_test, lr_test_pred, lr_test_score)
    results["logistic_regression"]["financial"] = financial_impact(df_test, y_test, lr_test_pred)
    results["logistic_regression"]["val_f1"] = float(f1_score(y_val, lr_val_pred, zero_division=0))

    # Candidate 2: Random Forest
    rf = RandomForestClassifier(n_estimators=200, max_depth=8, class_weight="balanced", random_state=42)
    rf.fit(X_train_s, y_train)
    rf_val_pred = rf.predict(X_val_s)
    rf_test_pred = rf.predict(X_test_s)
    rf_test_score = rf.predict_proba(X_test_s)[:, 1]
    results["random_forest"] = evaluate("Random Forest", y_test, rf_test_pred, rf_test_score)
    results["random_forest"]["financial"] = financial_impact(df_test, y_test, rf_test_pred)
    results["random_forest"]["val_f1"] = float(f1_score(y_val, rf_val_pred, zero_division=0))

    # Candidate 3: Isolation Forest (unsupervised) — evaluated against labels for
    # comparison purposes only; in production this model does NOT see labels and
    # is used specifically for the behavioral/anomaly channel, not as the primary
    # supervised risk score.
    iso = IsolationForest(n_estimators=200, contamination=float(y_train.mean()), random_state=42)
    iso.fit(X_train_s)
    iso_raw = iso.predict(X_test_s)  # -1 = anomaly, 1 = normal
    iso_pred = (iso_raw == -1).astype(int)
    results["isolation_forest_unsupervised"] = evaluate(
        "Isolation Forest (unsupervised, for reference)", y_test, iso_pred
    )
    results["isolation_forest_unsupervised"]["financial"] = financial_impact(df_test, y_test, iso_pred)

    # ---- Model selection: pick the supervised model with the best VALIDATION F1
    # (test set is only touched for final reporting, never for selection) ----
    candidates = {"logistic_regression": (lr, results["logistic_regression"]["val_f1"]),
                  "random_forest": (rf, results["random_forest"]["val_f1"])}
    best_name = max(candidates, key=lambda k: candidates[k][1])
    best_model = candidates[best_name][0]
    print(f"\n>>> Selected model based on validation F1: {best_name}")

    joblib.dump({"model": best_model, "scaler": scaler, "features": FEATURE_COLUMNS,
                 "model_name": best_name, "version": "v1"}, os.path.join(args.out, "risk_model.joblib"))
    joblib.dump({"model": iso, "scaler": scaler, "features": FEATURE_COLUMNS, "version": "v1"},
                os.path.join(args.out, "behavioral_model.joblib"))

    with open(os.path.join(args.out, "metrics.json"), "w") as f:
        json.dump({"selected_model": best_name, "results": results}, f, indent=2)

    print(f"\nSaved model artifacts + metrics.json to {args.out}")


if __name__ == "__main__":
    main()
