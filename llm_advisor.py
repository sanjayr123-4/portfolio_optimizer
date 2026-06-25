import os
import json
import re
import numpy as np
import pandas as pd
import yfinance as yf
from dotenv import load_dotenv
from google import genai

from data_loader import fetch_stock_data
from feature_engineering import create_latest_features, FEATURE_COLUMNS
from model_training import get_model_scores


load_dotenv()


def clean_value(value):
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    if isinstance(value, (float, np.float64, np.float32)):
        if np.isnan(value) or np.isinf(value):
            return None
        return float(value)

    return value


def clean_dataframe(df):
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.where(pd.notnull(df), None)

    for col in df.columns:
        df[col] = df[col].apply(clean_value)

    return df


def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file.")

    return genai.Client(api_key=api_key)


def extract_json(text):
    match = re.search(r"\{.*\}", text, re.DOTALL)

    if not match:
        raise ValueError("No JSON found in Gemini response.")

    return json.loads(match.group())


def get_size_bracket(market_cap):
    if market_cap is None:
        return "Unknown"

    try:
        market_cap = float(market_cap)
    except Exception:
        return "Unknown"

    if market_cap >= 200_000_000_000:
        return "Mega Cap"
    elif market_cap >= 10_000_000_000:
        return "Large Cap"
    elif market_cap >= 2_000_000_000:
        return "Mid Cap"
    else:
        return "Small Cap"


def get_stock_info(ticker):
    try:
        stock = yf.Ticker(ticker)

        company = ticker
        sector = "Unknown"
        market_cap = None

        try:
            fast_info = stock.fast_info
            market_cap = fast_info.get("market_cap", None)
        except Exception:
            pass

        try:
            info = stock.info
            company = info.get("shortName", ticker)
            sector = info.get("sector", "Unknown")
            market_cap = market_cap or info.get("marketCap", None)
        except Exception:
            pass

        return {
            "ticker": ticker,
            "company": company,
            "sector": sector,
            "market_cap": market_cap,
            "size_bracket": get_size_bracket(market_cap)
        }

    except Exception:
        return {
            "ticker": ticker,
            "company": ticker,
            "sector": "Unknown",
            "market_cap": None,
            "size_bracket": "Unknown"
        }


def ask_gemini_for_alternatives(ticker, sector, size_bracket):
    client = get_gemini_client()
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    prompt = f"""
You are a stock screening assistant.

Original stock ticker: {ticker}
Sector: {sector}
Company size bracket: {size_bracket}

Recommend 5 alternative publicly traded stocks that are:
- in the SAME or similar sector
- in the SAME or very close company size bracket
- real Yahoo Finance tickers
- common stocks only
- not ETFs, not mutual funds, not crypto

Return only valid JSON in this exact format:

{{
  "alternatives": [
    {{
      "ticker": "TICKER",
      "company": "Company name",
      "reason": "short reason"
    }}
  ]
}}
"""

    response = client.models.generate_content(
        model=model_name,
        contents=prompt
    )

    return extract_json(response.text)


def calculate_model_scores_for_tickers(
    tickers,
    model,
    start_date="2021-01-01",
    end_date="2026-03-01"
):
    prices, returns = fetch_stock_data(tickers, start_date, end_date)

    latest_features = create_latest_features(returns)
    latest_features = latest_features.dropna(subset=FEATURE_COLUMNS)

    if latest_features.empty:
        return pd.DataFrame(columns=["Stock", "ML_Score"])

    scores_df = get_model_scores(model, latest_features)
    scores_df["ML_Score"] = scores_df["ML_Score"] * 100

    scores_df = clean_dataframe(scores_df)

    return scores_df


def recommend_same_sector_alternatives(
    selected_tickers,
    model,
    start_date="2021-01-01",
    end_date="2026-03-01"
):
    final_rows = []

    selected_tickers = [
        ticker.upper().strip()
        for ticker in selected_tickers
        if ticker.strip()
    ]

    try:
        selected_scores_df = calculate_model_scores_for_tickers(
            selected_tickers,
            model,
            start_date,
            end_date
        )
    except Exception:
        selected_scores_df = pd.DataFrame(columns=["Stock", "ML_Score"])

    selected_score_map = dict(
        zip(selected_scores_df["Stock"], selected_scores_df["ML_Score"])
    )

    for ticker in selected_tickers:
        original_info = get_stock_info(ticker)
        original_score = selected_score_map.get(ticker)

        if original_score is None:
            final_rows.append({
                "Original Stock": ticker,
                "Sector": original_info["sector"],
                "Size Bracket": original_info["size_bracket"],
                "Original Score": None,
                "Recommended Stock": "No recommendation",
                "Recommended Company": None,
                "Recommended Score": None,
                "Reason": "Could not calculate model score for this stock."
            })
            continue

        try:
            gemini_data = ask_gemini_for_alternatives(
                ticker=ticker,
                sector=original_info["sector"],
                size_bracket=original_info["size_bracket"]
            )

            alternatives = gemini_data.get("alternatives", [])

        except Exception as e:
            final_rows.append({
                "Original Stock": ticker,
                "Sector": original_info["sector"],
                "Size Bracket": original_info["size_bracket"],
                "Original Score": round(float(original_score), 1),
                "Recommended Stock": "AI unavailable",
                "Recommended Company": None,
                "Recommended Score": None,
                "Reason": f"Gemini temporarily unavailable: {str(e)[:120]}"
            })
            continue

        alt_tickers = []

        for alt in alternatives:
            alt_ticker = alt.get("ticker", "").upper().strip()

            if alt_ticker and alt_ticker != ticker:
                alt_tickers.append(alt_ticker)

        alt_tickers = list(dict.fromkeys(alt_tickers))

        if not alt_tickers:
            final_rows.append({
                "Original Stock": ticker,
                "Sector": original_info["sector"],
                "Size Bracket": original_info["size_bracket"],
                "Original Score": round(float(original_score), 1),
                "Recommended Stock": "Keep current stock",
                "Recommended Company": original_info["company"],
                "Recommended Score": round(float(original_score), 1),
                "Reason": "No valid alternatives returned by Gemini."
            })
            continue

        try:
            alt_scores_df = calculate_model_scores_for_tickers(
                alt_tickers,
                model,
                start_date,
                end_date
            )
        except Exception:
            alt_scores_df = pd.DataFrame(columns=["Stock", "ML_Score"])

        alt_reason_map = {
            alt.get("ticker", "").upper().strip(): alt.get("reason", "")
            for alt in alternatives
        }

        candidate_rows = []

        for _, row in alt_scores_df.iterrows():
            alt_ticker = row["Stock"]
            alt_score = row["ML_Score"]

            if alt_score is None:
                continue

            alt_info = get_stock_info(alt_ticker)

            candidate_rows.append({
                "ticker": alt_ticker,
                "company": alt_info["company"],
                "score": alt_score,
                "reason": alt_reason_map.get(alt_ticker, "")
            })

        if not candidate_rows:
            final_rows.append({
                "Original Stock": ticker,
                "Sector": original_info["sector"],
                "Size Bracket": original_info["size_bracket"],
                "Original Score": round(float(original_score), 1),
                "Recommended Stock": "Keep current stock",
                "Recommended Company": original_info["company"],
                "Recommended Score": round(float(original_score), 1),
                "Reason": "Could not calculate valid model scores for alternatives."
            })
            continue

        candidate_df = pd.DataFrame(candidate_rows)
        candidate_df = candidate_df.replace([np.inf, -np.inf], np.nan).dropna(subset=["score"])

        if candidate_df.empty:
            final_rows.append({
                "Original Stock": ticker,
                "Sector": original_info["sector"],
                "Size Bracket": original_info["size_bracket"],
                "Original Score": round(float(original_score), 1),
                "Recommended Stock": "Keep current stock",
                "Recommended Company": original_info["company"],
                "Recommended Score": round(float(original_score), 1),
                "Reason": "Alternative scores were invalid."
            })
            continue

        candidate_df = candidate_df.sort_values(by="score", ascending=False)
        best = candidate_df.iloc[0]

        if float(best["score"]) > float(original_score):
            final_rows.append({
                "Original Stock": ticker,
                "Sector": original_info["sector"],
                "Size Bracket": original_info["size_bracket"],
                "Original Score": round(float(original_score), 1),
                "Recommended Stock": best["ticker"],
                "Recommended Company": best["company"],
                "Recommended Score": round(float(best["score"]), 1),
                "Reason": "Model predicts a higher probability of positive 10-day return for this alternative."
            })
        else:
            final_rows.append({
                "Original Stock": ticker,
                "Sector": original_info["sector"],
                "Size Bracket": original_info["size_bracket"],
                "Original Score": round(float(original_score), 1),
                "Recommended Stock": "Keep current stock",
                "Recommended Company": original_info["company"],
                "Recommended Score": round(float(original_score), 1),
                "Reason": "Your model gives the current stock a stronger score than the alternatives."
            })

    result_df = pd.DataFrame(final_rows)
    result_df = clean_dataframe(result_df)

    return result_df