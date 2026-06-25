import { useEffect, useState, useRef } from "react";

const API_BASE = "http://127.0.0.1:8000";

// Live ticker data - 


function LiveTicker() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const tickerList = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AMD",
    "NFLX", "INTC", "AVGO", "ORCL", "CRM", "ADBE", "CSCO",

    "JPM", "BAC", "GS", "MS", "V", "MA", "AXP",

    "JNJ", "PFE", "UNH", "LLY", "MRK", "ABBV",

    "WMT", "COST", "KO", "PEP", "MCD", "NKE", "SBUX",

    "XOM", "CVX", "COP", "SLB",

    "SPY", "QQQ", "DIA", "IWM", "VTI",

    "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS",
    "SBIN.NS", "LT.NS", "BHARTIARTL.NS", "ITC.NS", "HINDUNILVR.NS",
    "ADANIENT.NS", "TATAMOTORS.NS", "MARUTI.NS", "BAJFINANCE.NS",
    "SUNPHARMA.NS",

    "RELIANCE.BO", "TCS.BO", "INFY.BO", "HDFCBANK.BO", "ICICIBANK.BO"
  ];

  const fetchLiveTape = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/live-prices?tickers=${tickerList.join(",")}`
      );

      const data = await res.json();
      console.log("Live prices:", data);

      if (Array.isArray(data.prices) && data.prices.length > 0) {
        const validPrices = data.prices
          .filter((item) => item.price !== null && item.price !== undefined)
          .map((item) => ({
            symbol: item.ticker,
            price: item.price,
            currency:
              item.currency ||
              (String(item.ticker).endsWith(".BO") ||
              String(item.ticker).endsWith(".NS")
                ? "₹"
                : "$"),
            change_percent:
              item.change_percent !== null && item.change_percent !== undefined
                ? Number(item.change_percent)
                : 0,
          }));

        setStocks(validPrices);
      } else {
        setStocks([]);
      }
    } catch (err) {
      console.error("Live ticker error:", err);
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveTape();

    const interval = setInterval(() => {
      fetchLiveTape();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const doubled = [...stocks, ...stocks];

  return (
    <div style={tickerWrap}>
      <div style={tickerLabel}>LIVE</div>

      <div style={tickerTrack}>
        {loading ? (
          <div style={{ color: "#7A85A0", fontSize: 12, paddingLeft: 16 }}>
            Loading live prices...
          </div>
        ) : stocks.length === 0 ? (
          <div style={{ color: "#FF5252", fontSize: 12, paddingLeft: 16 }}>
            Live prices unavailable
          </div>
        ) : (
          <div className="ticker-inner" style={tickerInner}>
            {doubled.map((s, i) => {
              const change = Number(s.change_percent);

              return (
                <span key={i} style={tickerItem}>
                  <span style={tickerSymbol}>{s.symbol}</span>

                  <span style={tickerPrice}>
                    {s.currency || "$"}
                    {Number(s.price).toFixed(2)}
                  </span>

                  <span
                    style={{
                      ...tickerChange,
                      color: change >= 0 ? "#00E676" : "#FF5252",
                    }}
                  >
                    {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                  </span>

                  <span style={tickerDivider}>|</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .ticker-inner {
          animation: tickerScroll 120s linear infinite;
          display: flex;
          white-space: nowrap;
          width: max-content;
        }

        .ticker-inner:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
function MiniChart({ positive }) {
  const points = positive
    ? [30, 25, 35, 28, 22, 32, 18, 10, 15, 5, 8, 2]
    : [5, 10, 8, 15, 12, 20, 25, 18, 28, 22, 32, 38];

  const w = 80, h = 32;
  const max = Math.max(...points), min = Math.min(...points);
  const norm = (v) => h - ((v - min) / (max - min)) * h;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i / (points.length - 1)) * w},${norm(p)}`).join(" ");
  const fill = path + ` L${w},${h} L0,${h} Z`;

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`g${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? "#00E676" : "#FF5252"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? "#00E676" : "#FF5252"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#g${positive})`} />
      <path d={path} fill="none" stroke={positive ? "#00E676" : "#FF5252"} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AllocationDonut({ rows }) {
  if (!rows || !rows.length) return null;
  const colors = ["#00E5FF", "#7B61FF", "#00E676", "#FFB800", "#FF5252", "#F06292", "#4FC3F7", "#A5D6A7"];
  const total = rows.reduce((s, r) => s + parseFloat(r.Weight_Percentage), 0);
  let cumulative = 0;
  const cx = 90, cy = 90, r = 70, strokeW = 22;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 30, flexWrap: "wrap" }}>
      <svg width={180} height={180} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1E2740" strokeWidth={strokeW} />
        {rows.map((row, i) => {
          const pct = parseFloat(row.Weight_Percentage) / total;
          const dashLen = pct * circumference;
          const offset = circumference - cumulative * circumference;
          cumulative += pct;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth={strokeW}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px`, transition: "stroke-dasharray 1s ease" }}
            />
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#E8EDF5" fontSize={13} fontWeight="700">Portfolio</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#7A85A0" fontSize={11}>Allocation</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 600 }}>{row.Stock}</span>
            <span style={{ color: "#7A85A0", fontSize: 13, marginLeft: "auto" }}>{row.Weight_Percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskReturnChart({ rows }) {
  if (!rows || !rows.length) return null;
  const colors = ["#00E5FF", "#7B61FF", "#00E676", "#FFB800", "#FF5252", "#F06292", "#4FC3F7", "#A5D6A7"];
  const W = 320, H = 200, pad = 40;

  const risks = rows.map(r => parseFloat(r.Risk) * 100);
  const returns = rows.map(r => parseFloat(r.Expected_Return) * 100);
  const maxR = Math.max(...risks) * 1.2 || 1;
  const maxRet = Math.max(...returns) * 1.2 || 1;
  const minRet = Math.min(...returns, 0);

  const toX = v => pad + (v / maxR) * (W - 2 * pad);
  const toY = v => H - pad - ((v - minRet) / (maxRet - minRet)) * (H - 2 * pad);

  return (
    <svg width={W} height={H} style={{ overflow: "visible", width: "100%", maxWidth: W }}>
      <defs>
        <linearGradient id="chartGrid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#7B61FF" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect x={pad} y={pad} width={W - 2 * pad} height={H - 2 * pad} fill="url(#chartGrid)" rx={4} />
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <g key={i}>
          <line x1={pad} y1={pad + t * (H - 2 * pad)} x2={W - pad} y2={pad + t * (H - 2 * pad)} stroke="#1E2740" strokeWidth={1} />
          <line x1={pad + t * (W - 2 * pad)} y1={pad} x2={pad + t * (W - 2 * pad)} y2={H - pad} stroke="#1E2740" strokeWidth={1} />
        </g>
      ))}
      <text x={W / 2} y={H - 4} textAnchor="middle" fill="#7A85A0" fontSize={10}>Risk →</text>
      <text x={10} y={H / 2} textAnchor="middle" fill="#7A85A0" fontSize={10} transform={`rotate(-90,10,${H / 2})`}>Return →</text>
      {rows.map((row, i) => {
        const x = toX(parseFloat(row.Risk) * 100);
        const y = toY(parseFloat(row.Expected_Return) * 100);
        const sz = 6 + parseFloat(row.Weight_Percentage) / 8;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={sz + 4} fill={colors[i % colors.length]} opacity={0.12} />
            <circle cx={x} cy={y} r={sz} fill={colors[i % colors.length]} opacity={0.85} />
            <text x={x} y={y - sz - 4} textAnchor="middle" fill={colors[i % colors.length]} fontSize={10} fontWeight="700">{row.Stock}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 40 }}>
      <div className="spinner" style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid #1E2740", borderTopColor: "#00E5FF" }} />
      <p style={{ color: "#7A85A0", fontSize: 14 }}>Crunching the numbers…</p>
    </div>
  );
}

export default function App() {
  const [numStocks, setNumStocks] = useState(2);
  const [tickers, setTickers] = useState(["", ""]);
  const [amount, setAmount] = useState(100000);
  const [maxWeight, setMaxWeight] = useState(75);
  const [activeIndex, setActiveIndex] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [result, setResult] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("table");
  const [animKey, setAnimKey] = useState(0);

  const updateTicker = (index, value) => {
    const copy = [...tickers];
    copy[index] = value;
    setTickers(copy);
    setActiveIndex(index);
  };

  const changeNumStocks = (n) => {
    setNumStocks(n);
    setTickers(Array(n).fill(""));
    setSuggestions([]);
    setResult(null);
    setRecommendations([]);
    setRecError("");
    setError("");
    setMaxWeight(Math.max(40, Math.ceil(100 / n)));
  };

  useEffect(() => {
    if (activeIndex === null) return;

    const query = tickers[activeIndex];

    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/search?q=${encodeURIComponent(query.trim())}`
        );

        const data = await res.json();
        console.log("Search response:", data);

        setSuggestions(data.suggestions || data.results || []);
      } catch (err) {
        console.error("Search error:", err);
        setSuggestions([]);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [tickers, activeIndex]);

  const selectStock = (symbol) => {
    const copy = [...tickers];
    copy[activeIndex] = symbol;
    setTickers(copy);
    setSuggestions([]);
    setActiveIndex(null);
  };

  const normalizeOptimizationResult = (data) => {
    if (data.rows && Array.isArray(data.rows)) {
      return data;
    }

    const rows = (data.allocation || []).map((row) => ({
      ...row,
      ML_Score: Number(row.ML_Score) > 1 ? Number(row.ML_Score) / 100 : Number(row.ML_Score),
      Expected_Return: Number(row.Expected_Return) > 1 ? Number(row.Expected_Return) / 100 : Number(row.Expected_Return),
      Risk: Number(row.Risk) > 1 ? Number(row.Risk) / 100 : Number(row.Risk),
    }));

    return {
      rows,
      portReturn: data.metrics?.expected_return !== undefined ? Number(data.metrics.expected_return) / 100 : 0,
      portRisk: data.metrics?.risk !== undefined ? Number(data.metrics.risk) / 100 : 0,
      sharpe: data.metrics?.sharpe_ratio ?? 0,
    };
  };

  const optimize = async () => {
    const selected = tickers.map(t => t.trim().toUpperCase()).filter(Boolean);
    if (selected.length !== numStocks) { setError("Please fill all stock fields."); return; }
    if (new Set(selected).size !== selected.length) { setError("Please select different stocks."); return; }

    setLoading(true);
    setRecLoading(false);
    setError("");
    setResult(null);
    setRecommendations([]);
    setRecError("");
    setAnimKey(k => k + 1);

    try {
      const optRes = await fetch(`${API_BASE}/api/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers: selected,
          investment_amount: Number(amount),
          max_weight: Number(maxWeight) / 100,
        }),
      });

      const optData = await optRes.json();
      const normalizedOptData = normalizeOptimizationResult(optData);

      if (!optRes.ok || optData.error || !normalizedOptData.rows?.length) {
        throw new Error(optData.error || "Optimization failed.");
      }

      setResult(normalizedOptData);
      setRecLoading(true);

      try {
        const recRes = await fetch(`${API_BASE}/api/recommend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tickers: selected }),
        });

        const recData = await recRes.json();

        if (recRes.ok && Array.isArray(recData.recommendations)) {
          setRecommendations(recData.recommendations);
          setRecError(recData.error || "");
        } else {
          setRecommendations([]);
          setRecError(recData.error || "Recommendations unavailable.");
        }
      } catch (recErr) {
        console.error("Recommendation fetch error:", recErr);
        setRecommendations([]);
        setRecError("Recommendations unavailable. Optimization still worked.");
      } finally {
        setRecLoading(false);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setRecLoading(false);
    }
  };

  const sharpeColor = result ? (Number(result.sharpe) >= 1.5 ? "#00E676" : Number(result.sharpe) >= 1 ? "#FFB800" : "#FF5252") : "#00E5FF";

  return (
    <div style={styles.page} onClick={() => { setSuggestions([]); }}>

      {/* ─── Top Ticker Bar ─── */}
      <LiveTicker />

      {/* ─── Hero ─── */}
      <div style={styles.hero}>
        <div className="float-icon" style={styles.heroIcon}>📈</div>
        <div>
          <h1 style={styles.heroTitle}>
            ML Portfolio
            <span style={styles.heroAccent}> Optimizer</span>
          </h1>
          <p style={styles.heroSub}>
            Machine-learning powered allocation · Real-time optimization · Gemini sector intelligence
          </p>
        </div>
      </div>

      {/* ─── Config Row ─── */}
      <div style={styles.configGrid}>
        {/* Portfolio Size */}
        <div style={styles.card} className="card-animate">
          <div style={styles.cardLabel}>Portfolio Size</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {[2, 3, 4, 5, 6, 8, 10].map(n => (
              <button key={n} onClick={() => changeNumStocks(n)} style={{
                ...styles.pill,
                background: numStocks === n ? "linear-gradient(135deg,#00E5FF,#7B61FF)" : "#161B27",
                color: numStocks === n ? "#000" : "#7A85A0",
                fontWeight: numStocks === n ? 800 : 500,
                border: numStocks === n ? "none" : "1px solid #1E2740",
                boxShadow: numStocks === n ? "0 4px 16px rgba(0,229,255,0.3)" : "none",
              }}>{n} Stocks</button>
            ))}
          </div>
        </div>

        {/* Investment Amount */}
        <div style={styles.card} className="card-animate">
          <div style={styles.cardLabel}>Investment Amount</div>
          <div style={{ position: "relative", marginTop: 12 }}>
            <span style={styles.currencySign}>$</span>
            <input
              style={{ ...styles.input, paddingLeft: 30 }}
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div style={{ color: "#7A85A0", fontSize: 12, marginTop: 8 }}>
            ≈ ${Number(amount).toLocaleString()} total capital
          </div>
        </div>

        {/* Max Allocation */}
        <div style={styles.card} className="card-animate">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={styles.cardLabel}>Max Allocation</div>
            <span style={styles.weightBadge}>{maxWeight}%</span>
          </div>
          <input
            type="range"
            min={Math.ceil(100 / numStocks)}
            max={100}
            step={5}
            value={maxWeight}
            onChange={e => setMaxWeight(Number(e.target.value))}
            style={{ width: "100%", marginTop: 18, accentColor: "#00E5FF", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", color: "#7A85A0", fontSize: 11, marginTop: 4 }}>
            <span>{Math.ceil(100 / numStocks)}% min</span><span>100% max</span>
          </div>
        </div>
      </div>

      {/* ─── Stock Picker ─── */}
      <div style={{ marginTop: 40 }}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionDot} />
          <h2 style={styles.sectionTitle}>Select Your Stocks</h2>
        </div>

        <div style={styles.stockGrid} onClick={e => e.stopPropagation()}>
          {Array.from({ length: numStocks }).map((_, i) => (
            <div key={i} style={{ ...styles.card, position: "relative" }} className="stock-card">
              <div style={styles.stockNum}>#{i + 1}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{
                  ...styles.stockAvatar,
                  background: tickers[i] ? "linear-gradient(135deg,#00E5FF22,#7B61FF22)" : "#161B27",
                  border: tickers[i] ? "1px solid #00E5FF44" : "1px solid #1E2740",
                  color: tickers[i] ? "#00E5FF" : "#7A85A0",
                }}>
                  {tickers[i] ? tickers[i].slice(0, 2).toUpperCase() : "?"}
                </div>
                <div>
                  <div style={{ color: "#E8EDF5", fontWeight: 700, fontSize: 15 }}>{tickers[i] || "Not Selected"}</div>
                  <div style={{ color: "#7A85A0", fontSize: 11 }}>Stock {i + 1}</div>
                </div>
              </div>
              <input
                style={styles.input}
                value={tickers[i] || ""}
                placeholder="Type Apple, NVDA, Tesla…"
                onFocus={() => setActiveIndex(i)}
                onChange={e => updateTicker(i, e.target.value)}
              />
              {activeIndex === i && suggestions.length > 0 && (
                <div style={styles.dropdown}>
                  {suggestions.map((s, idx) => (
                    <div key={idx} className="dropdown-item" onMouseDown={() => selectStock(s.symbol)} style={styles.dropdownItem}>
                      <span style={{ background: "#1E2740", borderRadius: 6, padding: "2px 8px", color: "#00E5FF", fontWeight: 700, fontSize: 12 }}>{s.symbol}</span>
                      <span style={{ color: "#7A85A0", fontSize: 13, marginLeft: 8 }}>{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ─── CTA Button ─── */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
        <button className="optimize-btn" style={styles.ctaButton} onClick={optimize} disabled={loading}>
          {loading ? (
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="spinner" style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #00000033", borderTopColor: "#000", display: "inline-block" }} />
              Optimizing…
            </span>
          ) : (
            <span>⚡ Optimize Portfolio</span>
          )}
        </button>
      </div>

      {/* ─── Results ─── */}
      {loading && <LoadingSpinner />}

      {result && !loading && (
        <div key={animKey} style={{ marginTop: 50 }}>

          {/* Metric Cards */}
          <div style={styles.sectionHeader}>
            <span style={styles.sectionDot} />
            <h2 style={styles.sectionTitle}>Optimization Results</h2>
          </div>

          <div style={styles.metricsRow}>
            {[
              {
                label: "Expected Annual Return",
                value: `${(Number(result.portReturn) * 100).toFixed(2)}%`,
                sub: "Projected yearly gain",
                color: "#00E676",
                icon: "📊",
                positive: true,
              },
              {
                label: "Annual Risk (Volatility)",
                value: `${(Number(result.portRisk) * 100).toFixed(2)}%`,
                sub: "Standard deviation",
                color: "#FFB800",
                icon: "⚡",
                positive: false,
              },
              {
                label: "Sharpe Ratio",
                value: Number(result.sharpe).toFixed(2),
                sub: Number(result.sharpe) >= 1.5 ? "Excellent risk-adjusted return" : Number(result.sharpe) >= 1 ? "Good risk-adjusted return" : "Below target threshold",
                color: sharpeColor,
                icon: "🎯",
                positive: Number(result.sharpe) >= 1,
              },
              {
                label: "Total Investment",
                value: `$${Number(amount).toLocaleString()}`,
                sub: `Across ${numStocks} positions`,
                color: "#00E5FF",
                icon: "💼",
                positive: true,
              },
            ].map((m, i) => (
              <div key={i} style={{ ...styles.metricCard, animationDelay: `${i * 0.1}s` }} className="metric-animate glow-card">
                <div style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</div>
                <div style={{ color: "#7A85A0", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</div>
                <div style={{ color: m.color, fontSize: 32, fontWeight: 900, margin: "6px 0", fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
                <div style={{ color: "#7A85A0", fontSize: 12 }}>{m.sub}</div>
                <div style={{ marginTop: 12 }}>
                  <MiniChart positive={m.positive} />
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={styles.tabBar}>
            {["table", "donut", "scatter"].map(tab => (
              <button key={tab} className="tab-btn" onClick={() => setActiveTab(tab)} style={{
                ...styles.tabBtn,
                color: activeTab === tab ? "#00E5FF" : "#7A85A0",
                borderBottom: activeTab === tab ? "2px solid #00E5FF" : "2px solid transparent",
              }}>
                {tab === "table" ? "📋 Breakdown" : tab === "donut" ? "🥧 Allocation" : "📍 Risk vs Return"}
              </button>
            ))}
          </div>

          <div style={styles.card}>
            {activeTab === "table" && (
              <>
                <h3 style={styles.cardTitle}>Portfolio Breakdown</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {["Stock", "ML Score", "Exp. Return", "Risk", "Allocation %", "Investment"].map(h => (
                          <th key={h} style={styles.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => {
                        const colors = ["#00E5FF", "#7B61FF", "#00E676", "#FFB800", "#FF5252", "#F06292", "#4FC3F7", "#A5D6A7"];
                        const c = colors[i % colors.length];
                        return (
                          <tr key={i}>
                            <td style={styles.td}>
                              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ background: c + "22", color: c, borderRadius: 6, padding: "2px 8px", fontWeight: 800, fontSize: 13 }}>{row.Stock}</span>
                              </span>
                            </td>
                            <td style={styles.td}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 60, height: 6, borderRadius: 3, background: "#1E2740", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${parseFloat(row.ML_Score) * 100}%`, background: `linear-gradient(90deg, ${c}, ${c}aa)`, borderRadius: 3 }} />
                                </div>
                                <span style={{ color: c, fontWeight: 700 }}>{(Number(row.ML_Score) * 100).toFixed(1)}%</span>
                              </div>
                            </td>
                            <td style={{ ...styles.td, color: "#00E676", fontWeight: 700 }}>+{(Number(row.Expected_Return) * 100).toFixed(1)}%</td>
                            <td style={{ ...styles.td, color: "#FFB800", fontWeight: 700 }}>{(Number(row.Risk) * 100).toFixed(1)}%</td>
                            <td style={styles.td}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#1E2740", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${row.Weight_Percentage}%`, background: `linear-gradient(90deg, ${c}, ${c}88)`, borderRadius: 3 }} />
                                </div>
                                <span style={{ color: "#E8EDF5", fontWeight: 700, minWidth: 36 }}>{row.Weight_Percentage}%</span>
                              </div>
                            </td>
                            <td style={{ ...styles.td, color: "#E8EDF5", fontWeight: 700 }}>
                              ${Math.round(Number(row.Investment_Amount)).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === "donut" && (
              <>
                <h3 style={styles.cardTitle}>Allocation Donut</h3>
                <AllocationDonut rows={result.rows} />
              </>
            )}

            {activeTab === "scatter" && (
              <>
                <h3 style={styles.cardTitle}>Risk vs Return Chart</h3>
                <p style={{ color: "#7A85A0", fontSize: 12, marginBottom: 16 }}>Bubble size = portfolio weight. Top-left is ideal.</p>
                <RiskReturnChart rows={result.rows} />
              </>
            )}
          </div>

          {/* Gemini Recommendations */}
          <div style={{ ...styles.card, marginTop: 28, borderColor: "#7B61FF44" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 26 }}>🤖</span>
              <div>
                <h3 style={{ ...styles.cardTitle, margin: 0 }}>Gemini Same-Sector Alternatives</h3>
                <p style={{ color: "#7A85A0", fontSize: 12, margin: 0 }}>AI-powered suggestions from similar industry sectors</p>
              </div>
            </div>

            {recLoading && <LoadingSpinner />}

            {!recLoading && recError && (
              <div style={{ padding: 16, marginBottom: 12, color: "#FFB800", background: "#2b210d", border: "1px solid #ffb80044", borderRadius: 10 }}>
                {recError}
              </div>
            )}

            {!recLoading && !recError && recommendations.length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: "#7A85A0" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                No recommendations returned.
              </div>
            )}

            {!recLoading && recommendations.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {Object.keys(recommendations[0]).map(key => (
                        <th key={key} style={styles.th}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((value, j) => (
                          <td key={j} style={styles.td}>{String(value ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <div style={{ color: "#7A85A0", fontSize: 12 }}>
          ML Portfolio Optimizer · Powered by machine learning & Gemini AI
        </div>
        <div style={{ color: "#2A3050", fontSize: 11, marginTop: 4 }}>
          Not financial advice. Past performance does not guarantee future results.
        </div>
      </div>
    </div>
  );
}

/* ─── Ticker Styles ─── */
const tickerWrap = {
  display: "flex",
  alignItems: "center",
  background: "#0D1117",
  borderBottom: "1px solid #1E2740",
  overflow: "hidden",
  height: 38,
  position: "sticky",
  top: 0,
  zIndex: 100,
};

const tickerLabel = {
  background: "#00E676",
  color: "#000",
  fontWeight: 900,
  fontSize: 10,
  padding: "4px 10px",
  letterSpacing: "0.12em",
  flexShrink: 0,
  height: "100%",
  display: "flex",
  alignItems: "center",
};

const tickerTrack = {
  overflow: "hidden",
  flex: 1,
  height: "100%",
  display: "flex",
  alignItems: "center",
};

const tickerInner = {
  display: "flex",
  whiteSpace: "nowrap",
  animation: "tickerScroll 55s linear infinite",
};

const tickerItem = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0 16px",
  gap: 8,
  fontSize: 12,
};

const tickerSymbol = {
  color: "#E8EDF5",
  fontWeight: 700,
};

const tickerPrice = {
  color: "#7A85A0",
};

const tickerChange = {
  fontWeight: 700,
  fontSize: 11,
};

const tickerDivider = {
  color: "#2A3050",
  marginLeft: 4,
};

/* ─── Main Styles ─── */
const styles = {
  page: {
    minHeight: "100vh",
    background: "#07090F",
    color: "#E8EDF5",
    fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
    paddingBottom: 60,
  },
  hero: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    padding: "50px 40px 30px",
    borderBottom: "1px solid #1E2740",
    background: "radial-gradient(ellipse at 20% 50%, rgba(0,229,255,0.04) 0%, transparent 60%)",
  },
  heroIcon: {
    fontSize: 56,
    flexShrink: 0,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 900,
    margin: 0,
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
  },
  heroAccent: {
    background: "linear-gradient(135deg, #00E5FF, #7B61FF)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSub: {
    color: "#7A85A0",
    fontSize: 15,
    margin: "8px 0 0",
  },
  configGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 20,
    padding: "32px 40px 0",
  },
  card: {
    background: "#0D1117",
    border: "1px solid #1E2740",
    borderRadius: 16,
    padding: 24,
  },
  cardLabel: {
    color: "#7A85A0",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  cardTitle: {
    color: "#E8EDF5",
    fontSize: 16,
    fontWeight: 700,
    margin: "0 0 16px",
  },
  pill: {
    padding: "8px 14px",
    borderRadius: 20,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "all 0.15s ease",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #1E2740",
    background: "#161B27",
    color: "#E8EDF5",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  currencySign: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#7A85A0",
    fontSize: 14,
    pointerEvents: "none",
  },
  weightBadge: {
    background: "linear-gradient(135deg,#00E5FF22,#7B61FF22)",
    border: "1px solid #00E5FF44",
    color: "#00E5FF",
    padding: "2px 12px",
    borderRadius: 20,
    fontWeight: 800,
    fontSize: 15,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 40px",
    marginBottom: 16,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#00E5FF,#7B61FF)",
    boxShadow: "0 0 12px rgba(0,229,255,0.6)",
  },
  sectionTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#E8EDF5",
  },
  stockGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: 18,
    padding: "0 40px",
  },
  stockNum: {
    position: "absolute",
    top: 12,
    right: 14,
    color: "#2A3050",
    fontWeight: 900,
    fontSize: 13,
  },
  stockAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 14,
    flexShrink: 0,
  },
  dropdown: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
    marginTop: 4,
    background: "#0D1117",
    border: "1px solid #1E2740",
    borderRadius: 12,
    zIndex: 9999,
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  },
  dropdownItem: {
    padding: "10px 14px",
    cursor: "pointer",
    borderBottom: "1px solid #1E2740",
    display: "flex",
    alignItems: "center",
    fontSize: 13,
  },
  errorBox: {
    margin: "20px 40px 0",
    padding: "14px 18px",
    background: "#3b1111",
    color: "#ff5252",
    borderRadius: 12,
    border: "1px solid #ff525244",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
  },
  ctaButton: {
    padding: "16px 48px",
    background: "linear-gradient(135deg, #00E5FF, #7B61FF)",
    color: "#000",
    border: "none",
    borderRadius: 50,
    fontWeight: 900,
    fontSize: 16,
    cursor: "pointer",
    letterSpacing: "0.02em",
    boxShadow: "0 6px 24px rgba(0,229,255,0.3)",
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 18,
    padding: "0 40px 24px",
  },
  metricCard: {
    background: "#0D1117",
    border: "1px solid #1E2740",
    borderRadius: 16,
    padding: 24,
  },
  tabBar: {
    display: "flex",
    gap: 0,
    margin: "0 40px 0",
    borderBottom: "1px solid #1E2740",
  },
  tabBtn: {
    background: "none",
    border: "none",
    padding: "12px 24px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "all 0.15s",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "10px 14px",
    color: "#7A85A0",
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: "1px solid #1E2740",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 14px",
    borderBottom: "1px solid #0D1117",
    color: "#E8EDF5",
    verticalAlign: "middle",
  },
  footer: {
    padding: "40px 40px 0",
    textAlign: "center",
    borderTop: "1px solid #1E2740",
    marginTop: 50,
  },
};
