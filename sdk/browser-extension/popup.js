/**
 * StickForStats Browser Extension — Popup Script
 * =================================================
 * Controls the popup UI: displays claim counts, breakdown by type,
 * issues summary, and action buttons.
 */

/* global chrome */

(function () {
  "use strict";

  // =========================================================================
  // DOM references
  // =========================================================================

  var totalCountEl = document.getElementById("totalCount");
  var issuesSection = document.getElementById("issuesSection");
  var issuesList = document.getElementById("issuesList");
  var statusMessage = document.getElementById("statusMessage");

  var btnValidate = document.getElementById("btnValidate");
  var btnRescan = document.getElementById("btnRescan");
  var btnOpenApp = document.getElementById("btnOpenApp");

  // Type-to-element mapping for the breakdown rows
  var countElements = {
    t_test: document.getElementById("count-t_test"),
    f_test: document.getElementById("count-f_test"),
    chi_square: document.getElementById("count-chi_square"),
    correlation: document.getElementById("count-correlation"),
    p_value: document.getElementById("count-p_value"),
    effect_size: document.getElementById("count-effect_size"),
    confidence_interval: document.getElementById("count-confidence_interval"),
    z_test: document.getElementById("count-z_test"),
    r_squared: document.getElementById("count-r_squared"),
    sample_size: document.getElementById("count-sample_size"),
  };

  var settings = {};

  // =========================================================================
  // INIT
  // =========================================================================

  function init() {
    loadSettings(function () {
      getCurrentTabId(function (tabId) {
        if (!tabId) {
          showStatus("No active tab found.", "error");
          return;
        }

        // Try to get the summary from background first
        chrome.runtime.sendMessage(
          { action: "getSummary", tabId: tabId },
          function (response) {
            if (response && response.summary) {
              renderSummary(response.summary);
            } else {
              // Fall back to asking the content script directly
              requestSummaryFromTab(tabId);
            }
          }
        );
      });
    });

    // Attach event listeners
    btnValidate.addEventListener("click", onValidate);
    btnRescan.addEventListener("click", onRescan);
    btnOpenApp.addEventListener("click", onOpenApp);
  }

  // =========================================================================
  // SETTINGS
  // =========================================================================

  function loadSettings(callback) {
    chrome.runtime.sendMessage({ action: "getSettings" }, function (response) {
      if (response && response.settings) {
        settings = response.settings;
      }

      // Disable validate button if no API key
      if (!settings.apiKey) {
        btnValidate.disabled = true;
        btnValidate.title = "Configure an API key in Settings to enable validation";
      }

      if (callback) callback();
    });
  }

  // =========================================================================
  // TAB HELPERS
  // =========================================================================

  function getCurrentTabId(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs.length > 0) {
        callback(tabs[0].id);
      } else {
        callback(null);
      }
    });
  }

  function requestSummaryFromTab(tabId) {
    chrome.tabs.sendMessage(tabId, { action: "getClaims" }, function (response) {
      if (chrome.runtime.lastError) {
        // Content script may not be loaded (e.g., chrome:// pages)
        totalCountEl.textContent = "--";
        showStatus(
          "Cannot scan this page. The extension only works on regular web pages.",
          "error"
        );
        return;
      }
      if (response) {
        renderSummary(response);
      } else {
        totalCountEl.textContent = "0";
      }
    });
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  function renderSummary(summary) {
    if (!summary) return;

    // Total count
    totalCountEl.textContent = summary.total || 0;

    // Breakdown by type
    var counts = summary.counts || {};
    Object.keys(countElements).forEach(function (type) {
      var el = countElements[type];
      if (!el) return;
      var val = counts[type] || 0;
      el.textContent = val;
      if (val === 0) {
        el.classList.add("zero");
      } else {
        el.classList.remove("zero");
      }
    });

    // Combine odds_ratio + hazard_ratio into one row
    var ratiosEl = document.getElementById("count-ratios");
    if (ratiosEl) {
      var ratioCount = (counts.odds_ratio || 0) + (counts.hazard_ratio || 0);
      ratiosEl.textContent = ratioCount;
      if (ratioCount === 0) {
        ratiosEl.classList.add("zero");
      } else {
        ratiosEl.classList.remove("zero");
      }
    }

    // Issues summary
    renderIssues(summary.items || []);
  }

  function renderIssues(items) {
    var warnings = [];
    var errors = [];

    items.forEach(function (item) {
      if (item.status === "warning") {
        warnings.push(item);
      } else if (item.status === "error") {
        errors.push(item);
      }
    });

    if (warnings.length === 0 && errors.length === 0) {
      issuesSection.classList.add("sfs-hidden");
      return;
    }

    issuesSection.classList.remove("sfs-hidden");
    issuesList.innerHTML = "";

    errors.forEach(function (item) {
      var div = document.createElement("div");
      div.className = "sfs-issue-item sfs-error";
      div.textContent = item.label + ": " + item.formatted + " — inconsistency detected";
      issuesList.appendChild(div);
    });

    warnings.forEach(function (item) {
      var div = document.createElement("div");
      div.className = "sfs-issue-item";
      div.textContent = item.label + ": " + item.formatted + " — minor issue";
      issuesList.appendChild(div);
    });
  }

  // =========================================================================
  // STATUS
  // =========================================================================

  function showStatus(msg, type) {
    statusMessage.textContent = msg;
    statusMessage.classList.remove("sfs-hidden", "sfs-status-error", "sfs-status-success");
    if (type === "error") {
      statusMessage.classList.add("sfs-status-error");
    } else if (type === "success") {
      statusMessage.classList.add("sfs-status-success");
    }
  }

  function hideStatus() {
    statusMessage.classList.add("sfs-hidden");
  }

  // =========================================================================
  // ACTIONS
  // =========================================================================

  function onValidate() {
    if (!settings.apiKey) {
      showStatus("Please configure an API key in Settings first.", "error");
      return;
    }

    btnValidate.disabled = true;
    btnValidate.textContent = "Validating...";
    hideStatus();

    getCurrentTabId(function (tabId) {
      if (!tabId) return;

      chrome.runtime.sendMessage(
        { action: "validateFromPopup", tabId: tabId },
        function (response) {
          btnValidate.disabled = false;
          btnValidate.textContent = "Validate with StickForStats";

          if (response && response.status === "validating") {
            showStatus("Validation request sent. Results will update shortly.", "success");
            // Re-fetch summary after a delay to show updated statuses
            setTimeout(function () {
              requestSummaryFromTab(tabId);
            }, 3000);
          } else {
            showStatus("Could not connect to content script.", "error");
          }
        }
      );
    });
  }

  function onRescan() {
    hideStatus();
    totalCountEl.textContent = "...";

    getCurrentTabId(function (tabId) {
      if (!tabId) return;

      chrome.tabs.sendMessage(tabId, { action: "scan" }, function (response) {
        if (chrome.runtime.lastError) {
          showStatus("Cannot communicate with this page.", "error");
          totalCountEl.textContent = "--";
          return;
        }
        if (response && typeof response.count === "number") {
          showStatus("Scan complete.", "success");
          // Refresh the full summary
          setTimeout(function () {
            requestSummaryFromTab(tabId);
          }, 300);
        }
      });
    });
  }

  function onOpenApp() {
    var baseUrl = settings.apiBaseUrl || "http://localhost:8000";
    // Strip trailing /api/... if present
    baseUrl = baseUrl.replace(/\/api.*$/, "").replace(/\/+$/, "");
    chrome.tabs.create({ url: baseUrl });
  }

  // =========================================================================
  // START
  // =========================================================================

  document.addEventListener("DOMContentLoaded", init);
})();
