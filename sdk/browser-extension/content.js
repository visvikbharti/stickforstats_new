/**
 * StickForStats Browser Extension — Content Script
 * ==================================================
 * Scans web page text nodes for APA-style statistical claims using regex
 * patterns ported from backend/core/manuscript/claim_extractor.py.
 *
 * Detected claims are wrapped in highlighted <span> elements with tooltips.
 * A MutationObserver re-scans when the DOM changes (debounced).
 */

/* global chrome */

(function () {
  "use strict";

  // Prevent double-injection
  if (window.__sfsContentScriptLoaded) return;
  window.__sfsContentScriptLoaded = true;

  // =========================================================================
  // REGEX PATTERNS — JavaScript equivalents of claim_extractor.py
  // =========================================================================

  const PATTERNS = {
    t_test: {
      // t(24) = 2.45  or  t(24) = -2.45, p = .013
      regex: /t\s*\(\s*(\d+(?:\.\d+)?)\s*\)\s*=\s*(-?\d+\.?\d*)/gi,
      label: "t-test",
      format: function (m) {
        return "t(" + m[1] + ") = " + m[2];
      },
    },
    f_test: {
      // F(2, 45) = 3.67
      regex: /F\s*\(\s*(\d+)\s*,\s*(\d+(?:\.\d+)?)\s*\)\s*=\s*(\d+\.?\d*)/gi,
      label: "F-test",
      format: function (m) {
        return "F(" + m[1] + ", " + m[2] + ") = " + m[3];
      },
    },
    chi_square: {
      // chi2(2) = 5.99  or  chi-square(2, N = 100) = 8.4
      // Unicode: \u03C7 = chi, \u00B2 = superscript 2, \u00B2 = squared
      regex:
        /(?:[\u03C7\u03A7][\u00B2\u00322]?|[Xx][\u00B2\u00322]|chi[- ]?square[d]?)\s*\(\s*(\d+)(?:\s*,\s*[Nn]\s*=\s*(\d+))?\s*\)\s*=\s*(\d+\.?\d*)/gi,
      label: "Chi-square",
      format: function (m) {
        var base = "\u03C7\u00B2(" + m[1];
        if (m[2]) base += ", N = " + m[2];
        return base + ") = " + m[3];
      },
    },
    p_value: {
      // p < .001, p = .05, p > .10, p <= .05, p >= .10
      regex:
        /(?<![A-Za-z])p\s*([<>=\u2264\u2265])\s*\.?(\d+\.?\d*)/gi,
      label: "p-value",
      format: function (m) {
        return "p " + m[1] + " " + m[2];
      },
    },
    correlation: {
      // r = .45 or r(48) = .67
      regex:
        /(?<![A-Za-z])r\s*(?:\(\s*(\d+)\s*\)\s*)?=\s*(-?\.?\d+\.?\d*)/gi,
      label: "Correlation",
      format: function (m) {
        if (m[1]) return "r(" + m[1] + ") = " + m[2];
        return "r = " + m[2];
      },
    },
    effect_size: {
      // Cohen's d = 0.80, eta-squared = .06, partial eta-squared = .12
      regex:
        /(?:Cohen[''\u2019]?s?\s*d\s*=\s*(-?\d+\.?\d*)|\u03B7[\u00B2\u00322]p?\s*=\s*\.?(\d+\.?\d*)|[Pp]artial\s+\u03B7[\u00B2\u00322]\s*=\s*\.?(\d+\.?\d*)|eta[- ]?squared\s*=\s*\.?(\d+\.?\d*)|[Hh]edges[''\u2019]?\s*g\s*=\s*(-?\d+\.?\d*))/gi,
      label: "Effect size",
      format: function (m) {
        if (m[1] !== undefined && m[1] !== "") return "Cohen's d = " + m[1];
        if (m[2] !== undefined && m[2] !== "") return "\u03B7\u00B2 = " + m[2];
        if (m[3] !== undefined && m[3] !== "")
          return "partial \u03B7\u00B2 = " + m[3];
        if (m[4] !== undefined && m[4] !== "")
          return "eta-squared = " + m[4];
        if (m[5] !== undefined && m[5] !== "") return "Hedges' g = " + m[5];
        return m[0];
      },
    },
    confidence_interval: {
      // 95% CI [0.45, 0.89]; 90% CI = (1.2, 3.4)
      regex:
        /(\d+)%?\s*CI\s*[=:]?\s*[\[(]\s*(-?\d+\.?\d*)\s*[,\u2013\u2014to -]\s*(-?\d+\.?\d*)\s*[\])]/gi,
      label: "Confidence interval",
      format: function (m) {
        return m[1] + "% CI [" + m[2] + ", " + m[3] + "]";
      },
    },
    z_test: {
      // z = 2.58, Z = -1.96
      regex: /(?<![A-Za-z])[zZ]\s*=\s*(-?\d+\.?\d*)/gi,
      label: "z-test",
      format: function (m) {
        return "z = " + m[1];
      },
    },
    r_squared: {
      // R2 = .34; Adjusted R2 = .31
      regex:
        /(?:[Aa]djusted\s+)?R[\u00B2\u00322]\s*=\s*\.?(\d+\.?\d*)/gi,
      label: "R-squared",
      format: function (m) {
        return "R\u00B2 = " + m[1];
      },
    },
    odds_ratio: {
      // OR = 2.45
      regex: /(?:OR|[Oo]dds\s+[Rr]atio)\s*=\s*(\d+\.?\d*)/gi,
      label: "Odds ratio",
      format: function (m) {
        return "OR = " + m[1];
      },
    },
    hazard_ratio: {
      // HR = 1.87
      regex: /(?:HR|[Hh]azard\s+[Rr]atio)\s*=\s*(\d+\.?\d*)/gi,
      label: "Hazard ratio",
      format: function (m) {
        return "HR = " + m[1];
      },
    },
    sample_size: {
      // N = 120; n = 45; 150 participants
      regex:
        /(?<![A-Za-z])[Nn]\s*=\s*(\d+)|sample\s+(?:size|of)\s*(?:=\s*|of\s+|was\s+)?(\d+)|(\d+)\s+participants/gi,
      label: "Sample size",
      format: function (m) {
        if (m[1]) return "N = " + m[1];
        if (m[2]) return "sample size = " + m[2];
        if (m[3]) return m[3] + " participants";
        return m[0];
      },
    },
  };

  // =========================================================================
  // STATE
  // =========================================================================

  var claims = []; // Array of { type, text, formatted, node, status }
  var settings = {
    autoHighlight: true,
    autoValidate: false,
    apiBaseUrl: "http://localhost:8000",
    apiKey: "",
  };
  var isScanning = false;

  // =========================================================================
  // SETTINGS — load from storage
  // =========================================================================

  function loadSettings(callback) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(
        {
          autoHighlight: true,
          autoValidate: false,
          apiBaseUrl: "http://localhost:8000",
          apiKey: "",
        },
        function (items) {
          settings = items;
          if (callback) callback();
        }
      );
    } else {
      if (callback) callback();
    }
  }

  // =========================================================================
  // DOM WALKING — find text nodes to scan
  // =========================================================================

  // Tags that should never be scanned
  var SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "IFRAME",
    "OBJECT",
    "EMBED",
    "SVG",
    "MATH",
    "CANVAS",
    "TEXTAREA",
    "INPUT",
    "SELECT",
    "CODE",
    "PRE",
  ]);

  function getTextNodes(root) {
    var nodes = [];
    var walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          // Skip empty nodes
          if (!node.textContent || node.textContent.trim().length === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          // Skip certain tags
          var parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          // Skip nodes we already wrapped
          if (parent.classList && parent.classList.contains("sfs-claim")) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      },
      false
    );
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    return nodes;
  }

  // =========================================================================
  // CLAIM DETECTION — apply regex patterns to text nodes
  // =========================================================================

  /**
   * Find all statistical claims in a text string.
   * Returns array of { type, match, index, length, formatted }
   */
  function findClaimsInText(text) {
    var found = [];

    Object.keys(PATTERNS).forEach(function (type) {
      var pat = PATTERNS[type];
      // Reset lastIndex for global regex
      pat.regex.lastIndex = 0;
      var m;
      while ((m = pat.regex.exec(text)) !== null) {
        found.push({
          type: type,
          matchText: m[0],
          index: m.index,
          length: m[0].length,
          formatted: pat.format(m),
          label: pat.label,
        });
      }
    });

    // Sort by position so we can process left to right
    found.sort(function (a, b) {
      return a.index - b.index;
    });

    // Remove overlapping matches — keep the longest match at each position
    var filtered = [];
    var lastEnd = -1;
    for (var i = 0; i < found.length; i++) {
      if (found[i].index >= lastEnd) {
        filtered.push(found[i]);
        lastEnd = found[i].index + found[i].length;
      } else if (found[i].length > filtered[filtered.length - 1].length) {
        // Replace shorter overlapping match with longer one
        filtered[filtered.length - 1] = found[i];
        lastEnd = found[i].index + found[i].length;
      }
    }

    return filtered;
  }

  /**
   * Wrap matched claims in text nodes with highlight spans.
   */
  function highlightTextNode(textNode, claimMatches) {
    if (!claimMatches.length) return;

    var parent = textNode.parentNode;
    if (!parent) return;

    var text = textNode.textContent;
    var fragment = document.createDocumentFragment();
    var pos = 0;

    claimMatches.forEach(function (claim) {
      // Add text before this match
      if (claim.index > pos) {
        fragment.appendChild(document.createTextNode(text.slice(pos, claim.index)));
      }

      // Create the highlight span
      var span = document.createElement("span");
      span.className = "sfs-claim";
      span.setAttribute("data-sfs-type", claim.type);
      span.setAttribute("data-sfs-formatted", claim.formatted);
      span.setAttribute("data-sfs-label", claim.label);
      span.setAttribute("data-sfs-status", "detected");
      span.textContent = text.slice(claim.index, claim.index + claim.length);

      // Add tooltip on hover
      span.addEventListener("mouseenter", showTooltip);
      span.addEventListener("mouseleave", hideTooltip);

      fragment.appendChild(span);

      // Track this claim
      claims.push({
        type: claim.type,
        text: claim.matchText,
        formatted: claim.formatted,
        label: claim.label,
        node: span,
        status: "detected",
      });

      pos = claim.index + claim.length;
    });

    // Add remaining text
    if (pos < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(pos)));
    }

    parent.replaceChild(fragment, textNode);
  }

  // =========================================================================
  // TOOLTIP
  // =========================================================================

  var tooltipEl = null;

  function createTooltipElement() {
    if (tooltipEl) return;
    tooltipEl = document.createElement("div");
    tooltipEl.className = "sfs-tooltip";
    tooltipEl.style.display = "none";
    document.body.appendChild(tooltipEl);
  }

  function showTooltip(event) {
    createTooltipElement();
    var target = event.currentTarget;
    var label = target.getAttribute("data-sfs-label") || "Claim";
    var formatted = target.getAttribute("data-sfs-formatted") || "";
    var status = target.getAttribute("data-sfs-status") || "detected";

    var statusText = {
      detected: "Detected (not yet validated)",
      valid: "Validated — consistent",
      warning: "Warning — minor issue",
      error: "Error — inconsistency found",
    };

    tooltipEl.innerHTML =
      "<strong>" +
      label +
      "</strong><br>" +
      formatted +
      "<br><em>" +
      (statusText[status] || status) +
      "</em>";
    tooltipEl.style.display = "block";

    var rect = target.getBoundingClientRect();
    tooltipEl.style.left = rect.left + window.scrollX + "px";
    tooltipEl.style.top = rect.bottom + window.scrollY + 6 + "px";
  }

  function hideTooltip() {
    if (tooltipEl) {
      tooltipEl.style.display = "none";
    }
  }

  // =========================================================================
  // MAIN SCAN
  // =========================================================================

  function scanPage() {
    if (isScanning) return;
    isScanning = true;

    // Clear previous claims
    removeHighlights();
    claims = [];

    var textNodes = getTextNodes(document.body);

    textNodes.forEach(function (node) {
      var text = node.textContent;
      if (text.length < 3) return; // skip trivially short nodes

      var matches = findClaimsInText(text);
      if (matches.length > 0) {
        highlightTextNode(node, matches);
      }
    });

    isScanning = false;

    // Update badge count
    updateBadge();

    // Send claim summary to popup / background
    sendClaimSummary();

    // Auto-validate if enabled
    if (settings.autoValidate && settings.apiKey && claims.length > 0) {
      validateClaims();
    }
  }

  function removeHighlights() {
    var existing = document.querySelectorAll(".sfs-claim");
    existing.forEach(function (span) {
      var parent = span.parentNode;
      if (parent) {
        var text = document.createTextNode(span.textContent);
        parent.replaceChild(text, span);
        parent.normalize(); // merge adjacent text nodes
      }
    });
    claims = [];
  }

  // =========================================================================
  // BADGE & MESSAGING
  // =========================================================================

  function updateBadge() {
    try {
      chrome.runtime.sendMessage({
        action: "updateBadge",
        count: claims.length,
      });
    } catch (e) {
      // Extension context may be invalid
    }
  }

  function sendClaimSummary() {
    var summary = buildClaimSummary();
    try {
      chrome.runtime.sendMessage({
        action: "claimSummary",
        summary: summary,
      });
    } catch (e) {
      // ignore
    }
  }

  function buildClaimSummary() {
    var counts = {};
    var items = [];

    claims.forEach(function (c) {
      counts[c.type] = (counts[c.type] || 0) + 1;
      items.push({
        type: c.type,
        label: c.label,
        text: c.text,
        formatted: c.formatted,
        status: c.status,
      });
    });

    return {
      total: claims.length,
      counts: counts,
      items: items,
      url: window.location.href,
      title: document.title,
    };
  }

  // =========================================================================
  // API VALIDATION
  // =========================================================================

  function validateClaims() {
    if (!settings.apiKey || !settings.apiBaseUrl) return;

    var claimTexts = claims.map(function (c) {
      return c.text;
    });

    // Collect the full text with claims for context
    var payload = {
      text: claimTexts.join("\n"),
      claims: claims.map(function (c) {
        return {
          type: c.type,
          text: c.text,
          formatted: c.formatted,
        };
      }),
    };

    var url = settings.apiBaseUrl.replace(/\/+$/, "") + "/api/v1/manuscript/consistency/";

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Token " + settings.apiKey,
      },
      body: JSON.stringify(payload),
    })
      .then(function (resp) {
        if (!resp.ok) throw new Error("API returned " + resp.status);
        return resp.json();
      })
      .then(function (data) {
        applyValidationResults(data);
      })
      .catch(function (err) {
        console.warn("[StickForStats] Validation request failed:", err.message);
      });
  }

  function applyValidationResults(data) {
    if (!data || !data.results) return;

    data.results.forEach(function (result, i) {
      if (i >= claims.length) return;

      var claim = claims[i];
      var status = "valid";

      if (result.severity === "error" || result.consistent === false) {
        status = "error";
      } else if (result.severity === "warning") {
        status = "warning";
      }

      claim.status = status;
      if (claim.node) {
        claim.node.setAttribute("data-sfs-status", status);
        claim.node.classList.remove(
          "sfs-claim-valid",
          "sfs-claim-warning",
          "sfs-claim-error"
        );
        if (status !== "detected") {
          claim.node.classList.add("sfs-claim-" + status);
        }
      }
    });

    // Notify popup of updated results
    sendClaimSummary();
  }

  // =========================================================================
  // MUTATION OBSERVER — re-scan on DOM changes (debounced)
  // =========================================================================

  var scanTimeout = null;

  function debouncedRescan() {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(function () {
      if (settings.autoHighlight) {
        scanPage();
      }
    }, 1500);
  }

  var observer = new MutationObserver(function (mutations) {
    // Only rescan if real content was added (not our own spans)
    var dominated = mutations.some(function (m) {
      if (m.type === "childList" && m.addedNodes.length > 0) {
        for (var i = 0; i < m.addedNodes.length; i++) {
          var node = m.addedNodes[i];
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            !node.classList.contains("sfs-claim") &&
            !node.classList.contains("sfs-tooltip")
          ) {
            return true;
          }
        }
      }
      return false;
    });
    if (dominated) debouncedRescan();
  });

  // =========================================================================
  // MESSAGE LISTENER — handle commands from popup / background
  // =========================================================================

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.action === "scan") {
      scanPage();
      sendResponse({ status: "ok", count: claims.length });
    } else if (msg.action === "getClaims") {
      sendResponse(buildClaimSummary());
    } else if (msg.action === "validate") {
      validateClaims();
      sendResponse({ status: "validating" });
    } else if (msg.action === "clearHighlights") {
      removeHighlights();
      updateBadge();
      sendResponse({ status: "cleared" });
    } else if (msg.action === "settingsUpdated") {
      loadSettings();
      sendResponse({ status: "ok" });
    }
    return true; // keep message channel open for async response
  });

  // =========================================================================
  // INIT
  // =========================================================================

  loadSettings(function () {
    if (settings.autoHighlight) {
      // Small delay to let page settle
      setTimeout(function () {
        scanPage();
        // Start observing after initial scan
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }, 500);
    }
  });
})();
