(() => {
  "use strict";

  const API_URL = "https://api.alternative.me/fng/?limit=1";
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const TOOLTIP_HTML = `
    <div class="tw-font-semibold tw-mb-1">How is the Fear &amp; Greed Index calculated?</div>
    <div>The Crypto Fear &amp; Greed Index (0–100) is provided by
      <a href="https://alternative.me/crypto/fear-and-greed-index/" target="_blank" rel="noopener"
         style="color:#7dd3fc;text-decoration:underline;">alternative.me</a>.
      It blends six market signals into a single sentiment score:</div>
    <ul style="margin:6px 0 0;padding-left:16px;list-style:disc;">
      <li>Volatility — 25%</li>
      <li>Market Momentum / Volume — 25%</li>
      <li>Social Media — 15%</li>
      <li>Surveys — 15%</li>
      <li>Bitcoin Dominance — 10%</li>
      <li>Google Trends — 10%</li>
    </ul>
    <div style="margin-top:6px;">0 = Extreme Fear · 100 = Extreme Greed.</div>`;

  // ---- state -------------------------------------------------------------
  let cache = null; // { value, label, ts }
  let started = false;

  // ---- helpers -----------------------------------------------------------
  const isDark = () =>
    document.body.classList.contains("darktheme") ||
    document.body.classList.contains("tw-dark") ||
    document.documentElement.classList.contains("dark");

  const colorFor = (value) => {
    const v = Number(value);
    if (v <= 24) return "#ea3943"; // Extreme Fear  (CoinGecko red)
    if (v <= 44) return "#f97316"; // Fear
    if (v <= 54) return "#f3ba2f"; // Neutral
    if (v <= 74) return "#93d900"; // Greed
    return "#16c784"; // Extreme Greed (CoinGecko green)
  };

  const debounce = (fn, wait) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  // ---- page detection ----------------------------------------------------
  const currentPage = () => {
    const p = location.pathname;
    if (/\/coins\/bitcoin(\/|$)/i.test(p)) return "btc";
    if (/^\/(?:[a-z]{2})?\/?$/i.test(p)) return "home";
    return null;
  };

  // ---- anchor discovery --------------------------------------------------
  const findHomeVolumeCard = () => {
    const labels = [...document.querySelectorAll("div")].filter((el) => {
      const t = el.textContent.replace(/\s+/g, " ").trim().toLowerCase();
      return t === "24h trading volume";
    });
    if (!labels.length) return null;
    const card = labels[0].closest('[data-view-component="true"].tw-overflow-hidden');
    return card || null;
  };

  const findBtcMarketCapRow = () => {
    const ths = [...document.querySelectorAll("th")].filter((el) => {
      const t = el.textContent.replace(/\s+/g, " ").trim().toLowerCase();
      return t === "market cap";
    });
    if (!ths.length) return null;
    const row = ths[0].closest("tr");
    return row || null;
  };

  const findAnchor = (page) => (page === "home" ? findHomeVolumeCard() : findBtcMarketCapRow());

  // ---- builders ----------------------------------------------------------
  const infoIcon = () =>
    `<span class="fng-info tw-inline-block" tabindex="0">` +
    `<i data-view-component="true" class="far fa-info-circle fa-fw"></i>` +
    `<span class="fng-tooltip" role="tooltip">${TOOLTIP_HTML}</span>` +
    `</span>`;

  const buildCard = () => {
    const card = document.createElement("div");
    card.setAttribute("data-fng-card", "home");
    card.className =
      "fng-card tw-overflow-hidden tw-flex tw-items-center tw-justify-between " +
      "tw-gap-3 tw-rounded-xl tw-bg-white tw-p-4 tw-ring-2 tw-h-full " +
      "tw-ring-gray-200 dark:tw-bg-moon-900 dark:tw-ring-moon-700";

    card.innerHTML = `
      <div class="tw-flex tw-flex-col tw-grow">
        <div class="tw-flex tw-flex-row tw-justify-between tw-items-center">
          <div class="tw-font-bold tw-text-gray-900 dark:tw-text-moon-50 tw-text-lg tw-leading-7">
            <span class="fng-value">--</span>
          </div>
        </div>
        <div class="tw-mt-1 tw-flex tw-flex-wrap tw-items-center tw-text-gray-500
                    dark:tw-text-moon-200 tw-font-semibold tw-text-sm tw-leading-5">
          Fear &amp; Greed Index
          ${infoIcon()}
          <span class="fng-class tw-ml-1.5 tw-font-semibold"></span>
        </div>
      </div>
      <a class="fng-gauge" href="https://alternative.me/crypto/fear-and-greed-index/"
         target="_blank" rel="noopener" title="Crypto Fear & Greed Index — alternative.me"
         style="--fng-value:0;--fng-color:#94a3b8">
        <span class="fng-gauge-inner">--</span>
      </a>`;
    return card;
  };

  const buildLine = () => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-fng-card", "btc");
    tr.setAttribute("data-view-component", "true");
    tr.className = "tw-flex tw-justify-between tw-py-3";
    tr.innerHTML = `
      <th data-view-component="true" class="tw-text-left tw-text-gray-500 dark:tw-text-moon-200 tw-font-medium tw-text-sm tw-leading-5">
        Fear &amp; Greed Index
        ${infoIcon()}
      </th>
      <td data-view-component="true" class="tw-pl-2 tw-text-right tw-text-gray-900 dark:tw-text-moon-50 tw-font-semibold tw-text-sm tw-leading-5">
        <span class="fng-value">--</span><span class="fng-class tw-ml-1.5 tw-font-semibold"></span>
      </td>`;
    return tr;
  };

  const buildFor = (page) => (page === "home" ? buildCard() : buildLine());

  const populate = (el, data) => {
    const value = String(data.value);
    const color = colorFor(data.value);
    el.querySelector(".fng-value").textContent = value;
    const cls = el.querySelector(".fng-class");
    cls.textContent = data.label ? "· " + data.label : "";
    cls.style.color = color;
    const gauge = el.querySelector(".fng-gauge");
    if (gauge) {
      gauge.style.setProperty("--fng-value", value);
      gauge.style.setProperty("--fng-color", color);
      gauge.querySelector(".fng-gauge-inner").textContent = value;
    }
    el.classList.toggle("fng-dark", isDark());
  };

  const loadData = (el) => {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      populate(el, cache);
      return;
    }
    fetch(API_URL)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((json) => {
        const d = json && json.data && json.data[0];
        if (!d) throw new Error("no data");
        cache = { value: d.value, label: d.value_classification, ts: Date.now() };
        populate(el, cache);
      })
      .catch(() => {
        /* leave placeholders ("--") on failure */
      });
  };

  // ---- injection ---------------------------------------------------------
  const inject = () => {
    const page = currentPage();
    const existing = document.querySelector("[data-fng-card]");

    if (!page) {
      if (existing) existing.remove();
      return;
    }

    if (existing && existing.getAttribute("data-fng-card") === page) {
      existing.classList.toggle("fng-dark", isDark());
      return;
    }
    if (existing) existing.remove();

    const anchor = findAnchor(page);
    if (!anchor) return; // not rendered yet — observer will retry

    const el = buildFor(page);
    anchor.insertAdjacentElement("afterend", el);
    loadData(el);
  };

  // ---- bootstrap ---------------------------------------------------------
  const start = () => {
    if (started) return;
    started = true;

    inject();

    // React to SPA navigation (Turbo / history API)
    const _push = history.pushState;
    const _replace = history.replaceState;
    history.pushState = function () {
      _push.apply(this, arguments);
      setTimeout(inject, 0);
    };
    history.replaceState = function () {
      _replace.apply(this, arguments);
      setTimeout(inject, 0);
    };
    window.addEventListener("popstate", () => setTimeout(inject, 0));
    document.addEventListener("turbo:render", () => setTimeout(inject, 0));

    // Retry while the target nodes are still being rendered by the SPA
    const obs = new MutationObserver(debounce(inject, 300));
    obs.observe(document.documentElement, { childList: true, subtree: true });

    // Keep the gauge inner circle in sync with theme changes
    new MutationObserver(() => {
      const c = document.querySelector("[data-fng-card]");
      if (c) c.classList.toggle("fng-dark", isDark());
    }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
