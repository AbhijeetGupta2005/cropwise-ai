import os
from collections import Counter

import numpy as np
from joblib import load


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

crop_xgb_pipeline = None
crop_rf_pipeline = None
crop_knn_pipeline = None
crop_label_dict = None

fertilizer_xgb_pipeline = None
fertilizer_rf_pipeline = None
fertilizer_svm_pipeline = None
fertilizer_label_dict = None


def load_model(path):
    return load(os.path.join(BASE_DIR, path))


def ensure_crop_models_loaded():
    global crop_xgb_pipeline, crop_rf_pipeline, crop_knn_pipeline, crop_label_dict

    if all([crop_xgb_pipeline, crop_rf_pipeline, crop_knn_pipeline, crop_label_dict]):
        return

    crop_xgb_pipeline = load_model("models/crop_recommendation/xgb_pipeline.joblib")
    crop_rf_pipeline = load_model("models/crop_recommendation/rf_pipeline.joblib")
    crop_knn_pipeline = load_model("models/crop_recommendation/knn_pipeline.joblib")
    crop_label_dict = load_model("models/crop_recommendation/label_dictionary.joblib")


def ensure_fertilizer_models_loaded():
    global fertilizer_xgb_pipeline, fertilizer_rf_pipeline, fertilizer_svm_pipeline, fertilizer_label_dict

    if all([fertilizer_xgb_pipeline, fertilizer_rf_pipeline, fertilizer_svm_pipeline, fertilizer_label_dict]):
        return

    fertilizer_xgb_pipeline = load_model("models/fertilizer_recommendation/xgb_pipeline.joblib")
    fertilizer_rf_pipeline = load_model("models/fertilizer_recommendation/rf_pipeline.joblib")
    fertilizer_svm_pipeline = load_model("models/fertilizer_recommendation/svm_pipeline.joblib")
    fertilizer_label_dict = load_model("models/fertilizer_recommendation/fertname_dict.joblib")


def run_ensemble_prediction(input_data, pipelines, label_lookup, model_keys):
    predictions = [pipeline.predict(input_data)[0] for pipeline in pipelines]
    probabilities = [max(pipeline.predict_proba(input_data)[0]) for pipeline in pipelines]
    labels = [label_lookup[prediction] for prediction in predictions]

    counts = Counter(labels)
    most_common = counts.most_common()
    if most_common[0][1] == 1:
        final_label = labels[probabilities.index(max(probabilities))]
    else:
        final_label = most_common[0][0]

    response = {"final_prediction": final_label}
    for key, label, probability in zip(model_keys, labels, probabilities):
        response[f"{key}_model_prediction"] = label
        response[f"{key}_model_probability"] = round(probability * 100, 2)
    return response


def crop_prediction(input_data):
    ensure_crop_models_loaded()
    input_data = np.array(input_data, dtype=np.float64)
    return run_ensemble_prediction(
        input_data,
        [crop_xgb_pipeline, crop_rf_pipeline, crop_knn_pipeline],
        crop_label_dict,
        ["xgb", "rf", "knn"],
    )


def fertilizer_prediction(input_data):
    ensure_fertilizer_models_loaded()
    input_data = np.array(input_data, dtype=np.float64)
    return run_ensemble_prediction(
        input_data,
        [fertilizer_xgb_pipeline, fertilizer_rf_pipeline, fertilizer_svm_pipeline],
        fertilizer_label_dict,
        ["xgb", "rf", "svm"],
    )
