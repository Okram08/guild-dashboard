/* ================================================================
   common.js — Shared utilities for guild-dashboard suite
   Used by: index.html, tournament.html
   Scope: formatting, Yahoo Finance fetching, currency rates, toasts,
          proxy handling. No page-specific logic here.
   ================================================================ */

/* -------- CORS proxy (user-configured Cloudflare Worker) -------- */

window.GDCommon = (function(){
  const LS_PROXY_KEY = "guildDashboard.proxyUrl";

  function getProxyUrl(){
    try {
      return (localStorage.getItem(LS_PROXY_KEY) || "").trim();
    } catch(e){ return ""; }
  }
  function setProxyUrl(url){
    try {
      localStorage.setItem(LS_PROXY_KEY, (url || "").trim());
    } catch(e){}
  }

  /* -------- Formatters -------- */

  function fmt(n){
    if(n == null || isNaN(n)) n = 0;
    return new Intl.NumberFormat("fr-FR", {maximumFractionDigits:0}).format(Math.round(n));
  }
  function fmtCompact(n){
    if(n == null || isNaN(n)) n = 0;
    if(n >= 1e6) return parseFloat((n/1e6).toFixed(n>=1e7?1:2)) + "M";
    if(n >= 1e3) return parseFloat((n/1e3).toFixed(n>=1e4?0:1)) + "k";
    return fmt(n);
  }
  function fmtPct(p, digits=2){
    if(p == null || isNaN(p)) p = 0;
    const s = p >= 0 ? "+" : "";
    return s + p.toFixed(digits) + "%";
  }
  function fmtDate(ts){
    const d = new Date(ts);
    return d.toLocaleDateString("fr-FR", {day:"2-digit", month:"2-digit", year:"numeric"});
  }

  /* -------- Toast (auto-creates container on first use) -------- */

  let toastEl = null;
  function ensureToast(){
    if(toastEl) return toastEl;
    toastEl = document.createElement("div");
    toastEl.id = "gd-toast";
    toastEl.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 10000;
      background: rgba(20, 20, 30, 0.95); color: #f0e4c4;
      padding: 14px 20px; border-radius: 4px;
      border: 1px solid rgba(251, 191, 36, 0.4);
      font-family: 'EB Garamond', serif; font-size: 15px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      opacity: 0; transition: opacity .3s; pointer-events: none;
      max-width: 380px;
    `;
    document.body.appendChild(toastEl);
    return toastEl;
  }
  function toast(msg, duration=2500){
    const el = ensureToast();
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(el._tid);
    el._tid = setTimeout(() => el.style.opacity = "0", duration);
  }

  /* -------- USD → EUR exchange rate (cached 10 min) -------- */

  let rateCache = { rate: null, ts: 0 };
  async function getUsdEurRate(){
    const now = Date.now();
    if(rateCache.rate && (now - rateCache.ts) < 10*60*1000){
      return rateCache.rate;
    }
    // Frankfurter is free, CORS-enabled, no key needed
    try {
      const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR", {cache:"no-store"});
      if(res.ok){
        const data = await res.json();
        if(data && data.rates && data.rates.EUR){
          rateCache = { rate: parseFloat(data.rates.EUR), ts: now };
          return rateCache.rate;
        }
      }
    } catch(e){
      console.warn("Frankfurter fail, using cached rate", e.message);
    }
    // Fallback: use old cache or reasonable default
    return rateCache.rate || 0.92;
  }

  /* -------- Yahoo Finance chart endpoint (needs CORS proxy) -------- */

  async function fetchYahooPrice(ticker){
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker.trim())}?interval=1d&range=1d`;
    const DEFAULT_PROXIES = [
      "https://corsproxy.io/?url=",
      "https://api.allorigins.win/raw?url=",
      "https://api.codetabs.com/v1/proxy?quest=",
    ];
    const custom = getProxyUrl();
    const proxies = custom ? [custom] : DEFAULT_PROXIES;

    let lastErr = null;
    for(const proxy of proxies){
      const url = proxy + encodeURIComponent(yahooUrl);
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 15000);
      try {
        let res;
        try {
          res = await fetch(url, {cache:"no-store", signal: ctrl.signal});
        } finally { clearTimeout(tid); }
        if(!res.ok){ lastErr = new Error("Proxy HTTP "+res.status); continue; }
        const data = await res.json();
        const result = data && data.chart && data.chart.result && data.chart.result[0];
        if(!result){
          throw new Error("Ticker inconnu sur Yahoo");
        }
        const price = result.meta && result.meta.regularMarketPrice;
        if(!price){ lastErr = new Error("Prix absent Yahoo"); continue; }
        const ts = result.meta.regularMarketTime;
        const currency = result.meta.currency || "USD";
        const dt = ts ? new Date(ts*1000) : new Date();
        return {
          price: parseFloat(price),
          currency,
          date: dt.toISOString().slice(0,10),
          time: dt.toTimeString().slice(0,8),
        };
      } catch(e){
        if(e.message && e.message.includes("Ticker inconnu")) throw e;
        if(e.name === "AbortError") lastErr = new Error("Timeout proxy (>15s)");
        else lastErr = e;
      }
    }
    throw lastErr || new Error("Tous les proxies ont échoué");
  }

  /* -------- Yahoo Finance historical chart endpoint -------- */
  // Returns weekly (or custom interval) price series over `range` period
  // Usage: await fetchYahooHistory("BTC-USD", "6mo", "1wk")
  //   range:    "1mo"|"3mo"|"6mo"|"1y"|"2y"|"5y"
  //   interval: "1d"|"1wk"|"1mo"
  // Returns: { series: [{t: unix_ms, price: float}], currency: "USD" }

  async function fetchYahooHistory(ticker, range = "6mo", interval = "1wk"){
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker.trim())}?interval=${interval}&range=${range}`;
    const DEFAULT_PROXIES = [
      "https://corsproxy.io/?url=",
      "https://api.allorigins.win/raw?url=",
      "https://api.codetabs.com/v1/proxy?quest=",
    ];
    const custom = getProxyUrl();
    const proxies = custom ? [custom] : DEFAULT_PROXIES;

    let lastErr = null;
    for(const proxy of proxies){
      const url = proxy + encodeURIComponent(yahooUrl);
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 20000); // 20s for bigger payload
      try {
        let res;
        try {
          res = await fetch(url, {cache:"no-store", signal: ctrl.signal});
        } finally { clearTimeout(tid); }
        if(!res.ok){ lastErr = new Error("Proxy HTTP "+res.status); continue; }
        const data = await res.json();
        const result = data && data.chart && data.chart.result && data.chart.result[0];
        if(!result){
          throw new Error("Ticker inconnu sur Yahoo");
        }
        const timestamps = result.timestamp || [];
        const closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
        const currency = (result.meta && result.meta.currency) || "USD";
        if(timestamps.length === 0){
          lastErr = new Error("Pas d'historique disponible pour "+ticker);
          continue;
        }
        // Pair timestamps with closes, skip nulls
        const series = [];
        for(let i = 0; i < timestamps.length; i++){
          if(closes[i] != null && !isNaN(closes[i])){
            series.push({ t: timestamps[i] * 1000, price: parseFloat(closes[i]) });
          }
        }
        if(series.length < 2){
          lastErr = new Error("Historique trop court pour "+ticker);
          continue;
        }
        return { series, currency };
      } catch(e){
        if(e.message && e.message.includes("Ticker inconnu")) throw e;
        if(e.name === "AbortError") lastErr = new Error("Timeout proxy (>20s)");
        else lastErr = e;
      }
    }
    throw lastErr || new Error("Tous les proxies ont échoué");
  }

  /* -------- Snapshot bridge (dashboard ↔ tournament) -------- */

  const SNAPSHOT_KEY = "guildDashboard.snapshot";

  function writeSnapshot(data){
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({
        ...data,
        timestamp: Date.now(),
      }));
    } catch(e){ console.warn("Snapshot write failed", e); }
  }
  function readSnapshot(){
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      if(!raw) return null;
      return JSON.parse(raw);
    } catch(e){ return null; }
  }

  /* -------- Public API -------- */

  return {
    getProxyUrl, setProxyUrl,
    fmt, fmtCompact, fmtPct, fmtDate,
    toast,
    getUsdEurRate,
    fetchYahooPrice,
    fetchYahooHistory,
    writeSnapshot, readSnapshot,
  };
})();
