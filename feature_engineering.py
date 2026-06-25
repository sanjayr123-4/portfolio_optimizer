import pandas as pd


FEATURE_COLUMNS = [
    "Return_1d",
    "MA_7",
    "MA_14",
    "Vol_7",
    "Vol_30",
    "Momentum_30",
    "MA_ratio",
    "Vol_ratio"
]


def create_training_dataset(returns_df):
    all_stock_data = []

    for stock in returns_df.columns:
        returns = returns_df[stock]
        df = pd.DataFrame()

        df["Return_1d"] = returns
        df["MA_7"] = returns.rolling(7).mean()
        df["MA_14"] = returns.rolling(14).mean()
        df["Vol_7"] = returns.rolling(7).std()
        df["Vol_30"] = returns.rolling(30).std()

        df["Momentum_30"] = (
            (1 + returns)
            .rolling(30)
            .apply(lambda x: x.prod() - 1)
        )

        df["MA_ratio"] = df["MA_7"] / (df["MA_14"] + 1e-8)
        df["Vol_ratio"] = df["Vol_7"] / (df["Vol_30"] + 1e-8)

        future_10_day_return = (
            (1 + returns)
            .rolling(10)
            .apply(lambda x: x.prod() - 1)
            .shift(-10)
        )

        df["Target"] = (future_10_day_return > 0).astype(int)
        df["Stock"] = stock

        all_stock_data.append(df)

    dataset = pd.concat(all_stock_data).dropna()
    return dataset


def create_latest_features(returns_df):
    latest_rows = []

    for stock in returns_df.columns:
        returns = returns_df[stock]

        row = {
            "Stock": stock,
            "Return_1d": returns.iloc[-1],
            "MA_7": returns.rolling(7).mean().iloc[-1],
            "MA_14": returns.rolling(14).mean().iloc[-1],
            "Vol_7": returns.rolling(7).std().iloc[-1],
            "Vol_30": returns.rolling(30).std().iloc[-1],
            "Momentum_30": (1 + returns.tail(30)).prod() - 1
        }

        row["MA_ratio"] = row["MA_7"] / (row["MA_14"] + 1e-8)
        row["Vol_ratio"] = row["Vol_7"] / (row["Vol_30"] + 1e-8)

        latest_rows.append(row)

    return pd.DataFrame(latest_rows)