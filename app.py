import streamlit as st
import matplotlib.pyplot as plt
from yahooquery import search
from streamlit_searchbox import st_searchbox

from optimizer import run_portfolio_optimizer
from llm_advisor import recommend_same_sector_alternatives


st.set_page_config(
    page_title="ML Portfolio Optimizer",
    page_icon="📈",
    layout="wide"
)

st.title("📈 Machine Learning Portfolio Optimizer")

st.write(
    "Search and select stocks from Yahoo Finance. "
    "The app dynamically trains a machine learning model, optimizes your portfolio, "
    "and uses Gemini to suggest same-sector alternatives."
)


def search_stocks(query: str):
    if not query or len(query) < 2:
        return []

    try:
        results = search(query)
        quotes = results.get("quotes", [])

        matches = []

        for item in quotes:
            symbol = item.get("symbol")
            name = item.get("shortname") or item.get("longname")
            quote_type = item.get("quoteType")

            if symbol and name and quote_type == "EQUITY":
                matches.append(f"{symbol} - {name}")

        return matches[:10]

    except Exception:
        return []


def extract_symbol(selection):
    if selection:
        return selection.split(" - ")[0].strip().upper()
    return None


st.subheader("Select Portfolio Size")

num_stocks = st.number_input(
    "Number of stocks in portfolio",
    min_value=2,
    max_value=10,
    value=4,
    step=1
)

st.subheader("Search and Select Portfolio Stocks")

selected_stocks = []

for i in range(num_stocks):
    stock_selection = st_searchbox(
        search_stocks,
        key=f"stock_{i}",
        placeholder=f"Search Stock {i + 1}"
    )

    symbol = extract_symbol(stock_selection)

    if symbol:
        selected_stocks.append(symbol)


investment_amount = st.number_input(
    "Investment Amount",
    min_value=1000,
    value=100000,
    step=1000
)

minimum_possible_max_weight = int(100 / num_stocks)

max_weight_percent = st.slider(
    "Maximum allocation per stock (%)",
    min_value=minimum_possible_max_weight,
    max_value=100,
    value=max(40, minimum_possible_max_weight),
    step=5
)

use_gemini = st.checkbox(
    "Enable Gemini same-sector alternative recommendations",
    value=True
)


if st.button("Optimize Portfolio"):
    try:
        tickers = selected_stocks

        if len(tickers) < 2:
            st.error("Please select at least 2 valid stocks.")

        elif len(tickers) != num_stocks:
            st.error("Please select all stock fields before optimizing.")

        elif len(set(tickers)) != len(tickers):
            st.error("Please select different stocks.")

        else:
            with st.spinner("Fetching data, training model, and optimizing portfolio..."):
                allocation, expected_return, risk, sharpe = run_portfolio_optimizer(
                    tickers=tickers,
                    investment_amount=investment_amount,
                    max_weight=max_weight_percent / 100
                )

            st.success("Portfolio optimized successfully!")

            col1, col2, col3 = st.columns(3)

            col1.metric("Expected Annual Return", f"{expected_return * 100:.2f}%")
            col2.metric("Annual Risk", f"{risk * 100:.2f}%")
            col3.metric("Sharpe Ratio", f"{sharpe:.2f}")

            st.subheader("Optimized Portfolio Allocation")

            display_df = allocation[
                [
                    "Stock",
                    "ML_Score",
                    "Expected_Return",
                    "Risk",
                    "Weight_Percentage",
                    "Investment_Amount"
                ]
            ].copy()

            display_df["ML_Score"] = (display_df["ML_Score"] * 100).round(2)
            display_df["Expected_Return"] = (display_df["Expected_Return"] * 100).round(2)
            display_df["Risk"] = (display_df["Risk"] * 100).round(2)

            display_df = display_df.rename(columns={
                "ML_Score": "ML Positive Return Score (%)",
                "Expected_Return": "ML-Adjusted Expected Return (%)",
                "Risk": "Annual Risk (%)",
                "Weight_Percentage": "Allocation (%)",
                "Investment_Amount": "Investment Amount"
            })

            st.dataframe(display_df, use_container_width=True)

            st.subheader("Allocation Chart")

            fig, ax = plt.subplots()
            ax.pie(
                allocation["Weight_Percentage"],
                labels=allocation["Stock"],
                autopct="%1.1f%%",
                startangle=90
            )
            ax.axis("equal")

            st.pyplot(fig)

            if use_gemini:
                st.subheader("🤖 Gemini Same-Sector Alternative Recommendations")

                with st.spinner("Gemini is analyzing sectors, company size, and alternatives..."):
                    recommendation_df = recommend_same_sector_alternatives(tickers)

                st.dataframe(recommendation_df, use_container_width=True)

    except Exception as e:
        st.error(f"Error: {e}")