(() => {
  "use strict";

  const API_URL = "https://api.alternative.me/fng/?limit=1";
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

  const findBtcPriceBlock = () => {
    const wrap = document.querySelector('div[data-coin-show-target="staticCoinPrice"]');
    if (!wrap) return null;
    return (
      wrap.querySelector("div.tw-mb-2.lg\\:tw-mb-3.tw-flex.tw-items-center.tw-flex-wrap") ||
      wrap
    );
  };

  const findAnchor = (page) => (page === "home" ? findHomeVolumeCard() : findBtcPriceBlock());

  // ---- card construction -------------------------------------------------
  const buildCard = () => {
    const card = document.createElement("div");
    card.setAttribute("data-fng-card", "");
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

  const populate = (card, data) => {
    const value = String(data.value);
    const color = colorFor(data.value);
    card.querySelector(".fng-value").textContent = value;
    const cls = card.querySelector(".fng-class");
    cls.textContent = data.label ? "· " + data.label : "";
    cls.style.color = color;
    const gauge = card.querySelector(".fng-gauge");
    gauge.style.setProperty("--fng-value", value);
    gauge.style.setProperty("--fng-color", color);
    gauge.querySelector(".fng-gauge-inner").textContent = value;
    card.classList.toggle("fng-dark", isDark());
  };

  const loadData = (card) => {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      populate(card, cache);
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
        populate(card, cache);
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

    const card = buildCard();
    card.setAttribute("data-fng-card", page);

    if (page === "home") {
      anchor.insertAdjacentElement("afterend", card);
    } else {
      card.classList.add("tw-mt-2", "lg:tw-mt-3");
      anchor.insertAdjacentElement("afterend", card);
    }

    loadData(card);
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
