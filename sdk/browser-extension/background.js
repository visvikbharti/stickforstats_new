/**
 * StickForStats Browser Extension — Background Service Worker
 * =============================================================
 * Manages badge counts per tab, relays messages between content script
 * and popup, handles settings storage, and can optionally forward
 * validation requests to the StickForStats API.
 */

/* global chrome */

// =========================================================================
// BADGE MANAGEMENT
// =========================================================================

// Store claim counts per tab
var tabCounts = {};

// Store claim summaries per tab (for popup retrieval)
var tabSummaries = {};

/**
 * Set the badge text and color for a given tab.
 */
function setBadge(tabId, count) {
  var text = count > 0 ? String(count) : "";
  var color = count > 0 ? "#1976d2" : "#999999";

  chrome.action.setBadgeText({ text: text, tabId: tabId });
  chrome.action.setBadgeBackgroundColor({ color: color, tabId: tabId });
}

// =========================================================================
// MESSAGE HANDLING
// =========================================================================

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  var tabId = sender.tab ? sender.tab.id : null;

  switch (message.action) {
    case "updateBadge":
      if (tabId !== null) {
        tabCounts[tabId] = message.count || 0;
        setBadge(tabId, message.count || 0);
      }
      sendResponse({ status: "ok" });
      break;

    case "claimSummary":
      if (tabId !== null && message.summary) {
        tabSummaries[tabId] = message.summary;
      }
      sendResponse({ status: "ok" });
      break;

    case "getSummary":
      // Called from popup to get current tab summary
      if (message.tabId && tabSummaries[message.tabId]) {
        sendResponse({ summary: tabSummaries[message.tabId] });
      } else {
        sendResponse({ summary: null });
      }
      break;

    case "getSettings":
      chrome.storage.sync.get(
        {
          autoHighlight: true,
          autoValidate: false,
          apiBaseUrl: "http://localhost:8000",
          apiKey: "",
          highlightColorDetected: "#1976d2",
          highlightColorValid: "#2e7d32",
          highlightColorWarning: "#ed6c02",
          highlightColorError: "#d32f2f",
        },
        function (items) {
          sendResponse({ settings: items });
        }
      );
      return true; // async response

    case "saveSettings":
      if (message.settings) {
        chrome.storage.sync.set(message.settings, function () {
          // Notify all content scripts of the update
          chrome.tabs.query({}, function (tabs) {
            tabs.forEach(function (tab) {
              try {
                chrome.tabs.sendMessage(tab.id, {
                  action: "settingsUpdated",
                });
              } catch (e) {
                // tab may not have content script
              }
            });
          });
          sendResponse({ status: "saved" });
        });
      }
      return true; // async response

    case "validateFromPopup":
      // Forward validation request to the content script in the active tab
      if (message.tabId) {
        chrome.tabs.sendMessage(
          message.tabId,
          { action: "validate" },
          function (response) {
            sendResponse(response || { status: "no_response" });
          }
        );
      }
      return true; // async response

    default:
      sendResponse({ status: "unknown_action" });
  }

  return false;
});

// =========================================================================
// TAB LIFECYCLE
// =========================================================================

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener(function (tabId) {
  delete tabCounts[tabId];
  delete tabSummaries[tabId];
});

// Reset badge when navigating to a new page
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
  if (changeInfo.status === "loading") {
    tabCounts[tabId] = 0;
    delete tabSummaries[tabId];
    setBadge(tabId, 0);
  }
});

// =========================================================================
// INSTALL / UPDATE
// =========================================================================

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === "install") {
    // Set default settings on first install
    chrome.storage.sync.set({
      autoHighlight: true,
      autoValidate: false,
      apiBaseUrl: "http://localhost:8000",
      apiKey: "",
      highlightColorDetected: "#1976d2",
      highlightColorValid: "#2e7d32",
      highlightColorWarning: "#ed6c02",
      highlightColorError: "#d32f2f",
    });
  }
});
