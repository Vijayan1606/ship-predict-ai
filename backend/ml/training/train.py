"""
Machine Learning Training and Evaluation Pipeline for ShipPredict AI.
Trains and compares baseline and ensemble models:
1. Linear Regression (Baseline)
2. Random Forest Regressor
3. Gradient Boosting Regressor
4. HistGradientBoostingRegressor

Computes MAE, RMSE, R2, Median Absolute Error, Delay Classification metrics,
and saves artifacts for inference and SHAP explainability.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import Dict, Any

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import (
    RandomForestRegressor,
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
    RandomForestClassifier
)
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    mean_absolute_error,
    root_mean_squared_error,
    r2_score,
    median_absolute_error,
    classification_report,
    confusion_matrix,
    f1_score,
    accuracy_score
)

from backend.ml.data.journey_generator import generate_shipment_dataset
from backend.ml.features.pipeline import (
    build_feature_dataframe,
    get_feature_column_names,
    create_preprocessor,
    chronological_train_test_split,
    FEATURE_METADATA
)


def categorize_delay(delay_hours: float) -> str:
    """Classifies delay into 4 operational severity tiers."""
    if delay_hours <= 0.0:
        return "On Time"
    elif delay_hours <= 6.0:
        return "Minor Delay"
    elif delay_hours <= 24.0:
        return "Moderate Delay"
    else:
        return "Severe Delay"


def train_and_evaluate_models(
    dataset_path: str = "data/processed/shipments.csv",
    models_output_dir: str = "models"
) -> Dict[str, Any]:
    """
    Main model training, evaluation, comparison, and serialization procedure.
    """
    # Ingest or generate dataset if missing
    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}, generating fresh dataset...")
        df_shipments, _ = generate_shipment_dataset(num_shipments=1500)
    else:
        df_shipments = pd.read_csv(dataset_path)

    print(f"Loaded {len(df_shipments)} shipment records.")

    # Feature transformation
    df_features = build_feature_dataframe(df_shipments)
    feature_cols = get_feature_column_names()

    # Chronological splitting (no temporal leakage)
    train_df, test_df = chronological_train_test_split(df_features, test_ratio=0.20)
    print(f"Train split: {len(train_df)} records | Test split: {len(test_df)} records.")

    X_train = train_df[feature_cols]
    y_train = train_df["remaining_delay_hours"]

    X_test = test_df[feature_cols]
    y_test = test_df["remaining_delay_hours"]

    # Candidate Models definition
    candidate_models = {
        "Linear Regression (Baseline)": LinearRegression(),
        "Random Forest Regressor": RandomForestRegressor(
            n_estimators=100, max_depth=12, random_state=42, n_jobs=-1
        ),
        "Gradient Boosting Regressor": GradientBoostingRegressor(
            n_estimators=100, max_depth=5, learning_rate=0.08, random_state=42
        ),
        "HistGradientBoosting Regressor": HistGradientBoostingRegressor(
            max_iter=120, max_depth=7, learning_rate=0.08, random_state=42
        )
    }

    results = {}
    best_model_name = None
    best_mae = float("inf")
    best_pipeline = None

    for model_name, model in candidate_models.items():
        print(f"Training {model_name}...")
        preprocessor = create_preprocessor()
        pipeline = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("model", model)
        ])

        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        # Remaining delay cannot be physically negative
        y_pred = np.clip(y_pred, 0.0, None)

        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(root_mean_squared_error(y_test, y_pred))
        r2 = float(r2_score(y_test, y_pred))
        medae = float(median_absolute_error(y_test, y_pred))

        results[model_name] = {
            "mae": round(mae, 3),
            "rmse": round(rmse, 3),
            "r2": round(r2, 4),
            "median_absolute_error": round(medae, 3),
        }
        print(f"-> {model_name}: MAE={mae:.3f}h, RMSE={rmse:.3f}h, R2={r2:.4f}, MedAE={medae:.3f}h")

        if mae < best_mae:
            best_mae = mae
            best_model_name = model_name
            best_pipeline = pipeline

    print(f"\nOptimal Model Selected: {best_model_name} with MAE: {best_mae:.3f} hours.")

    # Train Classifier for Delay Severity
    print("Training Delay Severity Classifier (Random Forest)...")
    clf_pipeline = Pipeline(steps=[
        ("preprocessor", create_preprocessor()),
        ("classifier", RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1))
    ])
    y_train_class = train_df["delay_severity"]
    y_test_class = test_df["delay_severity"]
    clf_pipeline.fit(X_train, y_train_class)

    y_class_pred = clf_pipeline.predict(X_test)
    class_report = classification_report(y_test_class, y_class_pred, output_dict=True)
    class_acc = float(accuracy_score(y_test_class, y_class_pred))
    class_macro_f1 = float(f1_score(y_test_class, y_class_pred, average="macro"))
    class_weighted_f1 = float(f1_score(y_test_class, y_class_pred, average="weighted"))

    labels = ["On Time", "Minor Delay", "Moderate Delay", "Severe Delay"]
    cm = confusion_matrix(y_test_class, y_class_pred, labels=labels).tolist()

    per_class_metrics = {}
    for label in labels:
        if label in class_report:
            per_class_metrics[label] = {
                "precision": round(float(class_report[label]["precision"]), 4),
                "recall": round(float(class_report[label]["recall"]), 4),
                "f1_score": round(float(class_report[label]["f1-score"]), 4),
                "support": int(class_report[label]["support"])
            }

    classification_metrics = {
        "accuracy": round(class_acc, 4),
        "macro_f1": round(class_macro_f1, 4),
        "weighted_f1": round(class_weighted_f1, 4),
        "labels": labels,
        "per_class_metrics": per_class_metrics,
        "confusion_matrix": cm,
        "classification_report": class_report
    }

    # Extract Feature Importances from the best regression pipeline if supported
    feature_importance_list = []
    regressor = best_pipeline.named_steps["model"]
    prep = best_pipeline.named_steps["preprocessor"]

    try:
        # Get transformed feature names
        num_cols = FEATURE_METADATA["numerical_features"]
        cat_encoder = prep.named_transformers_["cat"]
        cat_encoded_cols = list(cat_encoder.get_feature_names_out(FEATURE_METADATA["categorical_features"]))
        bool_cols = FEATURE_METADATA["boolean_features"]
        all_transformed_feature_names = num_cols + cat_encoded_cols + bool_cols

        if hasattr(regressor, "feature_importances_"):
            raw_weights = np.array(regressor.feature_importances_)
        elif hasattr(regressor, "coef_"):
            raw_weights = np.abs(regressor.coef_)
        else:
            raw_weights = np.ones(len(all_transformed_feature_names))

        sum_w = np.sum(raw_weights)
        norm_weights = (raw_weights / sum_w) if sum_w > 0 else raw_weights
        feature_importance_list = [
            {"feature": feat, "importance": round(float(imp), 4)}
            for feat, imp in zip(all_transformed_feature_names, norm_weights)
        ]
        feature_importance_list.sort(key=lambda x: x["importance"], reverse=True)
    except Exception as e:
        print(f"Warning extracting feature importances: {e}")

    # Prepare serialized artifacts
    os.makedirs(models_output_dir, exist_ok=True)
    best_model_path = os.path.join(models_output_dir, "best_model.joblib")
    classifier_model_path = os.path.join(models_output_dir, "classifier_model.joblib")
    metrics_path = os.path.join(models_output_dir, "metrics.json")
    feature_importance_path = os.path.join(models_output_dir, "feature_importance.json")
    shap_sample_path = os.path.join(models_output_dir, "shap_background.joblib")

    joblib.dump(best_pipeline, best_model_path)
    joblib.dump(clf_pipeline, classifier_model_path)

    # Save a small preprocessed sample for SHAP background explainer
    shap_background_sample = X_train.sample(min(120, len(X_train)), random_state=42)
    joblib.dump(shap_background_sample, shap_sample_path)

    evaluation_summary = {
        "model_version": "v1.2.0",
        "trained_timestamp": datetime.now(timezone.utc).isoformat(),
        "best_model_name": best_model_name,
        "train_samples": len(train_df),
        "test_samples": len(test_df),
        "regression_metrics": results,
        "best_regression_metrics": results[best_model_name],
        "classification_metrics": classification_metrics,
        "delay_thresholds": {
            "on_time_hours": "<= 0.0",
            "minor_delay_hours": "0.0 < x <= 6.0",
            "moderate_delay_hours": "6.0 < x <= 24.0",
            "severe_delay_hours": "> 24.0"
        }
    }

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(evaluation_summary, f, indent=2)

    with open(feature_importance_path, "w", encoding="utf-8") as f:
        json.dump(feature_importance_list, f, indent=2)

    print(f"Saved artifacts to {models_output_dir}/")
    return evaluation_summary


if __name__ == "__main__":
    train_and_evaluate_models()
