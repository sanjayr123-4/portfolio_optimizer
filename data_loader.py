import yfinance as yf
import pandas as pd


def fetch_stock_data(tickers, start_date="2021-01-01", end_date="2026-03-01"):
    data = yf.download(
        tickers,
        start=start_date,
        end=end_date,
        auto_adjust=True,
        progress=False
    )

    if data.empty:
        raise ValueError("No data found. Check ticker symbols.")

    if isinstance(data.columns, pd.MultiIndex):
        prices = data["Close"]
    else:
        prices = data[["Close"]]
        prices.columns = tickers

    prices = prices.ffill().bfill()
    returns = prices.pct_change().dropna()

    return prices, returns