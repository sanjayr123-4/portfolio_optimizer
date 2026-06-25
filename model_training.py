from sklearn.ensemble import RandomForestClassifier
from feature_engineering import FEATURE_COLUMNS


def train_model(dataset):
    X = dataset[FEATURE_COLUMNS]
    y = dataset["Target"]

    model = RandomForestClassifier(
        n_estimators=500,
        max_depth=6,
        min_samples_split=20,
        min_samples_leaf=10,
        random_state=42
    )

    model.fit(X, y)

    return model


def get_model_scores(model, latest_features):
    X_latest = latest_features[FEATURE_COLUMNS]

    probabilities = model.predict_proba(X_latest)[:, 1]

    scores = latest_features[["Stock"]].copy()
    scores["ML_Score"] = probabilities

    return scores