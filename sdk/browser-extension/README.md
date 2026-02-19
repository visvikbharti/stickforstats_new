# StickForStats Browser Extension — Statistical Claim Detector

A Chrome/Firefox browser extension that scans web pages for APA-style statistical claims and highlights them inline. Optionally connects to a StickForStats API instance for consistency validation.

## Features

- **Automatic detection** of statistical claims on any web page:
  - t-tests: `t(24) = 2.45`
  - F-tests / ANOVA: `F(2, 45) = 3.67`
  - Chi-square tests: `chi-square(2) = 5.99`
  - Correlations: `r = .45`, `r(48) = .67`
  - p-values: `p < .001`, `p = .05`
  - Effect sizes: `Cohen's d = 0.80`, eta-squared, Hedges' g
  - Confidence intervals: `95% CI [0.45, 0.89]`
  - z-tests, R-squared, odds ratios, hazard ratios, sample sizes
- **Color-coded highlighting** with hover tooltips showing claim details
- **Popup summary** showing claim counts broken down by type
- **API validation** via StickForStats consistency-checking endpoint
- **Customizable** highlight colors, auto-scan behavior, and API settings
- **MutationObserver** automatically re-scans when page content changes

## Installation (Chrome — Load Unpacked)

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select the `sdk/browser-extension/` directory from this repository.
5. The StickForStats icon (blue circle) will appear in the toolbar.

## Installation (Firefox — Temporary Add-on)

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select the `manifest.json` file inside `sdk/browser-extension/`.
4. The extension will be active until Firefox is closed.

**Note:** For permanent Firefox installation, the manifest would need to be adapted to use Manifest V2 with a `background.scripts` array instead of a service worker. The content script, popup, and options pages work identically.

## Usage

### Automatic Scanning

By default, the extension scans every page you visit as soon as it finishes loading. Statistical claims are highlighted with a **blue dotted underline**. Hover over any highlighted claim to see a tooltip with the parsed type and value.

### Popup

Click the extension icon in the toolbar to open the popup. It displays:

- **Total claim count** found on the current page.
- **Breakdown** by claim type (t-tests, F-tests, correlations, etc.).
- **Issues** section if any claims were flagged during validation.
- **Validate with StickForStats** button to send claims to the API.
- **Re-scan Page** button to re-run detection.
- Link to open the full StickForStats web application.

### Validation

To use the validation feature:

1. Open extension settings (click "Extension Settings" at the bottom of the popup, or right-click the icon and choose "Options").
2. Enter the **Base URL** of your StickForStats instance (default: `http://localhost:8000`).
3. Enter your **API Key** (obtain from your StickForStats account).
4. Optionally enable **Auto-validate** to validate claims automatically on every page.
5. Click **Save Settings**.

When validation runs, claims are re-colored:

| Color | Meaning |
|-------|---------|
| Blue dotted underline | Detected, not yet validated |
| Green solid underline | Validated as consistent |
| Orange dashed underline | Minor issue / warning |
| Red solid underline | Inconsistency detected |

### Settings

Accessible from the popup footer or `chrome://extensions` > StickForStats > Options.

| Setting | Default | Description |
|---------|---------|-------------|
| Base URL | `http://localhost:8000` | StickForStats API server URL |
| API Key | (empty) | Authentication token for API requests |
| Auto-highlight | On | Scan pages automatically on load |
| Auto-validate | Off | Send claims to API automatically (requires API key) |
| Highlight colors | Blue/Green/Orange/Red | Customize per-status highlight colors |

## Connecting to StickForStats API

The extension sends claims to the **manuscript consistency** endpoint:

```
POST {baseUrl}/api/v1/manuscript/consistency/
Authorization: Token {apiKey}
Content-Type: application/json

{
  "text": "...",
  "claims": [
    { "type": "t_test", "text": "t(24) = 2.45", "formatted": "t(24) = 2.45" },
    ...
  ]
}
```

The API returns a `results` array with `severity` and `consistent` fields for each claim, which the extension maps to the color-coded highlight statuses.

## Regex Patterns

The JavaScript regex patterns in `content.js` are direct ports of the Python patterns in `backend/core/manuscript/claim_extractor.py`. They follow APA 7th Edition reporting conventions and handle Unicode characters for Greek letters and superscripts.

## File Structure

```
sdk/browser-extension/
  manifest.json      — Chrome Manifest V3 configuration
  content.js         — Content script: DOM scanning + claim detection
  background.js      — Service worker: badge management + message relay
  popup.html         — Popup UI layout
  popup.js           — Popup logic: display counts + trigger actions
  options.html       — Settings page layout
  options.js         — Settings logic: load/save via chrome.storage.sync
  styles.css         — Highlight + tooltip styles (injected into pages)
  icons/
    icon16.png       — Toolbar icon (16x16)
    icon48.png       — Extension page icon (48x48)
    icon128.png      — Chrome Web Store icon (128x128)
  README.md          — This file
```

## Development

To modify and test:

1. Edit the source files in this directory.
2. Go to `chrome://extensions/` and click the refresh icon on the StickForStats card.
3. Reload the web page you are testing on.
4. Open DevTools (F12) and check the Console for any `[StickForStats]` log messages.

## License

Part of the StickForStats project. See the repository root for license information.
