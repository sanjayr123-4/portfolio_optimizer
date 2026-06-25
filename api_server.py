from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
from yahooquery import search

from optimizer import run_portfolio_optimizer
from llm_advisor import recommend_same_sector_alternatives
import numpy as np
import pandas as pd


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OptimizeRequest(BaseModel):
    tickers: list[str]
    investment_amount: float = 100000
    max_weight: float = 0.40


class RecommendRequest(BaseModel):
    tickers: list[str]


class SearchRequest(BaseModel):
    query: str


latest_model = None


@app.get("/")
def home():
    return {"message": "Portfolio Optimization API is running"}


def get_stock_suggestions(query: str):
    result = search(query)
    quotes = result.get("quotes", [])
    suggestions = []

    for item in quotes[:12]:
        symbol = item.get("symbol")
        name = item.get("shortname") or item.get("longname") or symbol
        exchange = item.get("exchange", "")

        if symbol:
            suggestions.append({
                "symbol": symbol,
                "name": name,
                "exchange": exchange,
            })

    return suggestions


@app.get("/api/search")
def search_stocks_get(q: str):
    try:
        suggestions = get_stock_suggestions(q)
        return {"suggestions": suggestions, "results": suggestions}
    except Exception as e:
        return {"error": str(e), "suggestions": [], "results": []}


@app.post("/api/search")
def search_stocks_post(request: SearchRequest):
    try:
        suggestions = get_stock_suggestions(request.query)
        return {"suggestions": suggestions, "results": suggestions}
    except Exception as e:
        return {"error": str(e), "suggestions": [], "results": []}


@app.post("/api/optimize")
def optimize_portfolio_api(request: OptimizeRequest):
    global latest_model

    tickers = [ticker.upper().strip() for ticker in request.tickers if ticker.strip()]

    if len(tickers) < 2 or len(tickers) > 10:
        return {"error": "Please select between 2 and 10 stocks."}

    if len(set(tickers)) != len(tickers):
        return {"error": "Please select different stocks."}

    try:
        allocation, expected_return, risk, sharpe, model = run_portfolio_optimizer(
            tickers=tickers,
            investment_amount=request.investment_amount,
            max_weight=request.max_weight,
        )

        latest_model = model

        # Frontend expects raw decimals in rows:
        # ML_Score = 0.45, Expected_Return = 0.08, Risk = 0.27
        rows = allocation.to_dict(orient="records")

        # Also return percent-format values for compatibility/debugging.
        allocation_display = allocation.copy()
        allocation_display["ML_Score"] = (allocation_display["ML_Score"] * 100).round(1)
        allocation_display["Expected_Return"] = (allocation_display["Expected_Return"] * 100).round(2)
        allocation_display["Risk"] = (allocation_display["Risk"] * 100).round(2)

        return {
            "rows": rows,
            "allocation": allocation_display.to_dict(orient="records"),
            "portReturn": float(expected_return),
            "portRisk": float(risk),
            "sharpe": float(sharpe),
            "metrics": {
                "expected_return": round(float(expected_return) * 100, 2),
                "risk": round(float(risk) * 100, 2),
                "sharpe_ratio": round(float(sharpe), 2),
            },
        }

    except Exception as e:
        return {"error": str(e)}


@app.post("/api/recommend")
def recommend_api(request: RecommendRequest):
    global latest_model

    tickers = [ticker.upper().strip() for ticker in request.tickers]

    if latest_model is None:
        return {
            "recommendations": [],
            "error": "Please run portfolio optimization first before getting recommendations."
        }

    try:
        recommendations_df = recommend_same_sector_alternatives(
            selected_tickers=tickers,
            model=latest_model
        )

        recommendations_df = recommendations_df.replace([np.inf, -np.inf], np.nan)
        recommendations_df = recommendations_df.where(pd.notnull(recommendations_df), None)

        return {
            "recommendations": recommendations_df.to_dict(orient="records")
        }

    except Exception as e:
        print("RECOMMEND ERROR:", e)

        return {
            "recommendations": [],
            "error": str(e)
        }
def guess_currency(ticker: str):
    ticker = ticker.upper()
    if ticker.endswith(".BO") or ticker.endswith(".NS"):
        return "₹"
    if ticker.endswith(".L"):
        return "£"
    if ticker.endswith(".TO") or ticker.endswith(".V"):
        return "C$"
    if ticker.endswith(".AX"):
        return "A$"
    if ticker.endswith(".HK"):
        return "HK$"
    return "$"


@app.get("/api/live-prices")
def get_live_prices(tickers: str):
    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    prices = []

    for symbol in symbols:
        try:
            stock = yf.Ticker(symbol)
            hist = stock.history(period="5d", interval="1d", auto_adjust=True)

            if hist.empty or len(hist["Close"].dropna()) < 1:
                prices.append({
                    "ticker": symbol,
                    "price": None,
                    "currency": "₹" if symbol.endswith(".NS") or symbol.endswith(".BO") else "$",
                    "change_percent": None
                })
                continue

            close_prices = hist["Close"].dropna()
            last_price = float(close_prices.iloc[-1])

            if len(close_prices) >= 2:
                previous_close = float(close_prices.iloc[-2])
                change_percent = ((last_price - previous_close) / previous_close) * 100
            else:
                change_percent = 0

            prices.append({
                "ticker": symbol,
                "price": round(last_price, 2),
                "currency": "₹" if symbol.endswith(".NS") or symbol.endswith(".BO") else "$",
                "change_percent": round(change_percent, 2)
            })

        except Exception as e:
            print(f"Live price error for {symbol}:", e)
            prices.append({
                "ticker": symbol,
                "price": None,
                "currency": "₹" if symbol.endswith(".NS") or symbol.endswith(".BO") else "$",
                "change_percent": None
            })

    return {"prices": prices}
