# Fear & Greed Index for CoinGecko

A cross-browser (Chrome + Firefox) extension that shows the crypto
**Fear & Greed Index** ([alternative.me](https://alternative.me/crypto/fear-and-greed-index/))
directly inside [CoinGecko](https://www.coingecko.com/):

- **Top bar** (global navbar) — injected as a small stat right after
  *Dominance*, styled like the existing navbar stats (Market Cap, 24h Vol, …).
  Shows on every CoinGecko page.
- **Homepage** — injected as a card right after the *24h Trading Volume* card
  (same design, in the same responsive column).
- **Bitcoin page** (`/en/coins/bitcoin`) — injected as a stat **line** directly
  under the *Market Cap* row, matching the existing stats-table style (not a
  card).

All three show an info icon with a **tooltip** explaining how the index is
calculated (the alternative.me methodology: volatility, momentum/volume,
social media, surveys, Bitcoin dominance and Google Trends).

The card follows CoinGecko's own styling (Tailwind utility classes), so it
automatically matches the site's light/dark theme and responsive layout.

## How it works

- `manifest.json` — Manifest V3, content script on `*://*.coingecko.com/*`,
  with `host_permissions` for the alternative.me API.
- `content.js` — finds the right anchor on each page, builds a matching card,
  fetches the index, and keeps it in sync. It also handles CoinGecko's SPA
  navigation (Turbo / History API) and theme toggling.
- `content.css` — only the custom gauge styling (everything else reuses the
  site's own classes).
- `icons/` — toolbar/store icons.

## Load it (unpacked)

### Chrome / Edge / Brave (Chromium)
1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select this folder.
4. Visit https://www.coingecko.com/ and https://www.coingecko.com/en/coins/bitcoin.

### Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `manifest.json`.
3. Visit the same pages.

> The homepage card lives inside CoinGecko's stats column, which the site
> itself hides below `640px` width — so on small/mobile screens it follows the
> site and stays hidden, just like the *24h Trading Volume* card next to it.

## Notes
- The top-bar stat lives in the global navbar, so it appears on every page
  (home, coin pages, etc.) and follows the navbar's responsive horizontal
  scroll. Its tooltip opens *below* the icon since the bar sits at the top.
- On the Bitcoin page the index is a line in the stats table (under *Market
  Cap*), so it follows the site's responsive stats layout.
- The tooltip is self-contained CSS (it does not depend on CoinGecko's own
  tooltip JS), so it works reliably even as the page hydrates.
- Data is cached for 5 minutes to avoid redundant requests.
- If the API is unreachable the card shows `--` instead of a value.
- The optional `browser_specific_settings.gecko.id` makes the Firefox ID stable;
  remove it if you prefer a random temporary ID.
