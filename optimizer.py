import numpy as np
import pandas as pd
from scipy.optimize import minimize

from data_loader import fetch_stock_data
from feature_engineering import create_training_dataset, create_latest_features
from model_training import train_model, get_model_scores


def optimize_portfolio(returns_df, ml_scores, max_weight=0.40, risk_free_rate=0.02):
    stocks = ml_scores["Stock"].tolist()

    mean_returns = returns_df[stocks].mean() * 252
    covariance_matrix = returns_df[stocks].cov() * 252

    ml_probs = ml_scores.set_index("Stock").loc[stocks]["ML_Score"].values
    expected_returns = mean_returns.values * ml_probs

    num_assets = len(stocks)
    initial_weights = np.array([1 / num_assets] * num_assets)

    bounds = tuple((0, max_weight) for _ in range(num_assets))

    constraints = (
        {
            "type": "eq",
            "fun": lambda weights: np.sum(weights) - 1
        },
    )

    def negative_sharpe(weights):
        portfolio_return = np.dot(weights, expected_returns)

        portfolio_risk = np.sqrt(
            np.dot(weights.T, np.dot(covariance_matrix, weights))
        )

        sharpe = (portfolio_return - risk_free_rate) / (portfolio_risk + 1e-8)

        return -sharpe

    result = minimize(
        negative_sharpe,
        initial_weights,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints
    )

    if not result.success:
        raise ValueError("Optimization failed: " + result.message)

    allocation = pd.DataFrame({
        "Stock": stocks,
        "ML_Score": ml_probs,
        "Expected_Return": expected_returns,
        "Risk": np.sqrt(np.diag(covariance_matrix)),
        "Weight": result.x
    })

    allocation["Weight_Percentage"] = (allocation["Weight"] * 100).round(2)

    return allocation


def calculate_portfolio_metrics(returns_df, allocation, risk_free_rate=0.02):
    stocks = allocation["Stock"].tolist()
    weights = allocation["Weight"].values

    mean_returns = returns_df[stocks].mean() * 252
    covariance_matrix = returns_df[stocks].cov() * 252

    ml_probs = allocation.set_index("Stock").loc[stocks]["ML_Score"].values
    adjusted_returns = mean_returns.values * ml_probs

    expected_return = np.dot(weights, adjusted_returns)

    portfolio_risk = np.sqrt(
        np.dot(weights.T, np.dot(covariance_matrix, weights))
    )

    sharpe_ratio = (expected_return - risk_free_rate) / (portfolio_risk + 1e-8)

    return expected_return, portfolio_risk, sharpe_ratio


def run_portfolio_optimizer(
    tickers,
    investment_amount=100000,
    start_date="2021-01-01",
    end_date="2026-03-01",
    max_weight=0.40
):
    prices, returns = fetch_stock_data(tickers, start_date, end_date)

    dataset = create_training_dataset(returns)

    model = train_model(dataset)

    latest_features = create_latest_features(returns)

    ml_scores = get_model_scores(model, latest_features)

    allocation = optimize_portfolio(
        returns,
        ml_scores,
        max_weight=max_weight
    )

    expected_return, risk, sharpe = calculate_portfolio_metrics(
        returns,
        allocation
    )

    allocation["Investment_Amount"] = (
        allocation["Weight"] * investment_amount
    ).round(2)

    return allocation, expected_return, risk, sharpe, model


if __name__ == "__main__":
    tickers = ["AAPL", "MSFT", "NVDA", "GOOGL"]

    allocation, expected_return, risk, sharpe, model = run_portfolio_optimizer(
        tickers=tickers,
        investment_amount=100000
    )

    print("\nOptimized Portfolio Allocation:")
    print(
        allocation[
            [
                "Stock",
                "ML_Score",
                "Expected_Return",
                "Risk",
                "Weight_Percentage",
                "Investment_Amount"
            ]
        ]
    )

    print("\nPortfolio Metrics:")
    print("Expected Return:", expected_return)
    print("Risk:", risk)
    print("Sharpe Ratio:", sharpe)