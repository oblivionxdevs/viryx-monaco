/* ============================================================
   RENDERER — Viryx (WinForms WebView2 Edition)
   Tab management, Monaco setup, C# WebView2 API Exposure
   ============================================================ */
'use strict';
// ─── Monaco Loader ─────────────────────────────────────────
const MONACO_VERSION = '0.44.0';
const isFileProtocol = window.location.protocol === 'file:';
const monacoBase = isFileProtocol
  ? new URL('../node_modules/monaco-editor/min', window.location.href).href.replace(/\/$/, '')
  ? './' // Self-contained local folder mapping
  : `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min`;
const monacoPath = `${monacoBase}/vs`;
const monacoPath = isFileProtocol ? './vs' : `${monacoBase}/vs`;
window.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
// ─── Settings Modal & Form Handlers ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // New tab listener
  document.getElementById('btn-add-tab').addEventListener('click', handleNewTabClick);
  const btnAddTab = document.getElementById('btn-add-tab');
  if (btnAddTab) {
    btnAddTab.addEventListener('click', handleNewTabClick);
  }
  // Settings modals
  const settingsModal = document.getElementById('settings-modal');
  const btnSettings = document.getElementById('btn-settings');
  const btnCloseSettings = document.getElementById('settings-modal-close');
  btnSettings.addEventListener('click', () => settingsModal.classList.add('open'));
  btnCloseSettings.addEventListener('click', () => settingsModal.classList.remove('open'));
  
  settingsModal.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });
  if (btnSettings && settingsModal) {
    btnSettings.addEventListener('click', () => settingsModal.classList.add('open'));
  }
  if (btnCloseSettings && settingsModal) {
    btnCloseSettings.addEventListener('click', () => settingsModal.classList.remove('open'));
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
    });
  }
  // Slider font sizes
  const fontSizeSlider = document.getElementById('setting-font-size');
  const fontSizeVal    = document.getElementById('setting-font-size-val');
  fontSizeSlider.addEventListener('input', () => {
    const v = fontSizeSlider.value;
    fontSizeVal.textContent = `${v}px`;
    if (editor) editor.updateOptions({ fontSize: parseInt(v) });
  });
  if (fontSizeSlider) {
    fontSizeSlider.addEventListener('input', () => {
      const v = fontSizeSlider.value;
      if (fontSizeVal) fontSizeVal.textContent = `${v}px`;
      if (editor) editor.updateOptions({ fontSize: parseInt(v) });
    });
  }
  // Slider UI opacity
  const opacitySlider = document.getElementById('setting-opacity');
  const opacityVal    = document.getElementById('setting-opacity-val');
  opacitySlider.addEventListener('input', () => {
    const v = opacitySlider.value;
    opacityVal.textContent = `${v}%`;
    document.body.style.opacity = v / 100;
  });
  if (opacitySlider) {
    opacitySlider.addEventListener('input', () => {
      const v = opacitySlider.value;
      if (opacityVal) opacityVal.textContent = `${v}%`;
      document.body.style.opacity = v / 100;
    });
  }
  // Fonts select
  document.getElementById('setting-font').addEventListener('change', (e) => {
    if (editor) editor.updateOptions({ fontFamily: `"${e.target.value}", monospace` });
  });
  const settingFont = document.getElementById('setting-font');
  if (settingFont) {
    settingFont.addEventListener('change', (e) => {
      if (editor) editor.updateOptions({ fontFamily: `"${e.target.value}", monospace` });
    });
  }
  // Toggles
  document.getElementById('setting-wordwrap').addEventListener('change', (e) => {
    if (editor) editor.updateOptions({ wordWrap: e.target.checked ? 'on' : 'off' });
  });
  const settingWordWrap = document.getElementById('setting-wordwrap');
  if (settingWordWrap) {
    settingWordWrap.addEventListener('change', (e) => {
      if (editor) editor.updateOptions({ wordWrap: e.target.checked ? 'on' : 'off' });
    });
  }
  document.getElementById('setting-minimap').addEventListener('change', (e) => {
    if (editor) editor.updateOptions({ minimap: { enabled: e.target.checked } });
  });
  const settingMinimap = document.getElementById('setting-minimap');
  if (settingMinimap) {
    settingMinimap.addEventListener('change', (e) => {
      if (editor) editor.updateOptions({ minimap: { enabled: e.target.checked } });
    });
  }
  document.getElementById('setting-linenums').addEventListener('change', (e) => {
    if (editor) editor.updateOptions({ lineNumbers: e.target.checked ? 'on' : 'off' });
  });
  const settingLineNums = document.getElementById('setting-linenums');
  if (settingLineNums) {
    settingLineNums.addEventListener('change', (e) => {
      if (editor) editor.updateOptions({ lineNumbers: e.target.checked ? 'on' : 'off' });
    });
  }
  // Theme card selections
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => applyTheme(card.dataset.theme));
  });
});
