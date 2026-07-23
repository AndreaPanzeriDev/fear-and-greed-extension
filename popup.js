(() => {
  const FNG_URL = "https://api.alternative.me/fng/?limit=1";
  const BTC_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true";
  const BTC_SPARK_URL = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1";

  const ARC_LENGTH = 267;

  const colorFor = (v) => {
    if (v <= 24) return "#ea3943";
    if (v <= 44) return "#f97316";
    if (v <= 54) return "#f3ba2f";
    if (v <= 74) return "#93d900";
    return "#16c784";
  };

  const labelFor = (v) => {
    if (v <= 24) return "FEAR";
    if (v <= 44) return "FEAR";
    if (v <= 54) return "NEUTRAL";
    if (v <= 74) return "GREED";
    return "GREED";
  };

  const updateFNG = (value, classification) => {
    const v = Number(value);
    const color = colorFor(v);
    const label = classification || labelFor(v);

    const offset = ARC_LENGTH * (1 - v / 100);
    const gauge = document.getElementById("gauge");
    gauge.style.strokeDashoffset = offset;

    document.getElementById("gaugeValue").textContent = value;

    const labelEl = document.getElementById("gaugeLabel");
    labelEl.textContent = label;
    labelEl.style.fill = color;
  };

  const updateBTC = (price, change24h) => {
    const priceEl = document.getElementById("btcPrice");
    const changeEl = document.getElementById("btcChange");

    if (price != null) {
      priceEl.textContent = "$" + Number(price).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else {
      priceEl.textContent = "N/A";
    }

    if (change24h != null) {
      const sign = change24h >= 0 ? "+" : "";
      changeEl.textContent = sign + change24h.toFixed(1) + "%";
      changeEl.className = "btc-change " + (change24h >= 0 ? "up" : "down");
    }
  };

  const drawSparkline = (prices) => {
    if (!prices || prices.length < 2) return;
    const vals = prices.map((p) => p[1]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const w = 80;
    const h = 28;
    const pad = 2;

    const points = vals.map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (v - min) / range) * (h - pad * 2);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");

    document.getElementById("sparklinePath").setAttribute("points", points);
  };

  const updateFooter = (fngOk, btcOk) => {
    const el = document.getElementById("updatedLabel");
    const dot = document.getElementById("statusDot");
    if (fngOk && btcOk) {
      el.textContent = "Updated just now";
      dot.classList.add("ok");
    } else {
      el.textContent = "Failed to load data";
      el.classList.add("error");
    }
  };

  const fetchData = () => {
    const btn = document.getElementById("reloadBtn");
    btn.classList.add("spinning");

    let fngOk = false;
    let btcOk = false;

    const done = () => {
      updateFooter(fngOk, btcOk);
      btn.classList.remove("spinning");
    };

    fetch(FNG_URL)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((json) => {
        const d = json && json.data && json.data[0];
        if (!d) throw new Error("no data");
        updateFNG(d.value, d.value_classification);
        fngOk = true;
      })
      .catch(() => {})
      .finally(done);

    fetch(BTC_PRICE_URL)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((json) => {
        const data = json && json.bitcoin;
        if (!data) throw new Error("no data");
        updateBTC(data.usd, data.usd_24h_change);
        btcOk = true;
      })
      .catch(() => {})
      .finally(done);

    fetch(BTC_SPARK_URL)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((json) => {
        if (json && json.prices) drawSparkline(json.prices);
      })
      .catch(() => {});
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      fetchData();
      document.getElementById("reloadBtn").addEventListener("click", fetchData);
    });
  } else {
    fetchData();
    document.getElementById("reloadBtn").addEventListener("click", fetchData);
  }
})();
