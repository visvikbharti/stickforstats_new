/**
 * StickForStats Browser Extension — Options Page Script
 * =======================================================
 * Manages loading and saving of extension settings via chrome.storage.sync.
 */

/* global chrome */

(function () {
  "use strict";

  // =========================================================================
  // DOM references
  // =========================================================================

  var apiBaseUrlEl = document.getElementById("apiBaseUrl");
  var apiKeyEl = document.getElementById("apiKey");
  var autoHighlightEl = document.getElementById("autoHighlight");
  var autoValidateEl = document.getElementById("autoValidate");
  var colorDetectedEl = document.getElementById("colorDetected");
  var colorValidEl = document.getElementById("colorValid");
  var colorWarningEl = document.getElementById("colorWarning");
  var colorErrorEl = document.getElementById("colorError");
  var btnSave = document.getElementById("btnSave");
  var btnReset = document.getElementById("btnReset");
  var saveStatus = document.getElementById("saveStatus");

  // =========================================================================
  // DEFAULTS
  // =========================================================================

  var DEFAULTS = {
    apiBaseUrl: "http://localhost:8000",
    apiKey: "",
    autoHighlight: true,
    autoValidate: false,
    highlightColorDetected: "#1976d2",
    highlightColorValid: "#2e7d32",
    highlightColorWarning: "#ed6c02",
    highlightColorError: "#d32f2f",
  };

  // =========================================================================
  // LOAD
  // =========================================================================

  function loadSettings() {
    chrome.storage.sync.get(DEFAULTS, function (items) {
      apiBaseUrlEl.value = items.apiBaseUrl;
      apiKeyEl.value = items.apiKey;
      autoHighlightEl.checked = items.autoHighlight;
      autoValidateEl.checked = items.autoValidate;
      colorDetectedEl.value = items.highlightColorDetected;
      colorValidEl.value = items.highlightColorValid;
      colorWarningEl.value = items.highlightColorWarning;
      colorErrorEl.value = items.highlightColorError;
    });
  }

  // =========================================================================
  // SAVE
  // =========================================================================

  function saveSettings() {
    var newSettings = {
      apiBaseUrl: apiBaseUrlEl.value.trim() || DEFAULTS.apiBaseUrl,
      apiKey: apiKeyEl.value.trim(),
      autoHighlight: autoHighlightEl.checked,
      autoValidate: autoValidateEl.checked,
      highlightColorDetected: colorDetectedEl.value,
      highlightColorValid: colorValidEl.value,
      highlightColorWarning: colorWarningEl.value,
      highlightColorError: colorErrorEl.value,
    };

    chrome.runtime.sendMessage(
      { action: "saveSettings", settings: newSettings },
      function () {
        showSaveStatus("Settings saved successfully.");
      }
    );
  }

  // =========================================================================
  // RESET
  // =========================================================================

  function resetSettings() {
    apiBaseUrlEl.value = DEFAULTS.apiBaseUrl;
    apiKeyEl.value = DEFAULTS.apiKey;
    autoHighlightEl.checked = DEFAULTS.autoHighlight;
    autoValidateEl.checked = DEFAULTS.autoValidate;
    colorDetectedEl.value = DEFAULTS.highlightColorDetected;
    colorValidEl.value = DEFAULTS.highlightColorValid;
    colorWarningEl.value = DEFAULTS.highlightColorWarning;
    colorErrorEl.value = DEFAULTS.highlightColorError;

    chrome.runtime.sendMessage(
      { action: "saveSettings", settings: DEFAULTS },
      function () {
        showSaveStatus("Settings reset to defaults.");
      }
    );
  }

  // =========================================================================
  // STATUS
  // =========================================================================

  function showSaveStatus(msg) {
    saveStatus.textContent = msg;
    saveStatus.classList.add("visible");
    setTimeout(function () {
      saveStatus.classList.remove("visible");
    }, 2500);
  }

  // =========================================================================
  // EVENTS
  // =========================================================================

  btnSave.addEventListener("click", saveSettings);
  btnReset.addEventListener("click", resetSettings);

  // =========================================================================
  // INIT
  // =========================================================================

  document.addEventListener("DOMContentLoaded", loadSettings);
})();
