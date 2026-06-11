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
  : `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min`;
const monacoPath = `${monacoBase}/vs`;

window.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    const workerScript = `
      self.MonacoEnvironment = { baseUrl: '${monacoBase}/' };
      importScripts('${monacoBase}/vs/base/worker/workerMain.js');
    `;
    return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(workerScript);
  }
};

window.require = { paths: { vs: monacoPath } };

// Load Monaco dynamically
(function loadMonaco() {
  const script = document.createElement('script');
  script.src = `${monacoPath}/loader.js`;
  script.onload = () => {
    window.require(['vs/editor/editor.main'], () => {
      initMonaco();
    });
  };
  document.head.appendChild(script);
})();

// ─── State ─────────────────────────────────────────────────
let editor = null;
let tabCounter = 1;
let activeTabId = null;
const tabs = new Map(); // id → { name, model, contentListener }

const SCRIPT_STORAGE_KEY = 'viryx:scripts:v1';
const DEFAULT_SCRIPT = '-- Welcome to Viryx\n-- Start scripting below\n\nprint("Hello from Viryx!")\n';
let scriptSaveTimer = null;
let isRestoringScripts = false;

const THEMES = {
  'viryx-hologram': { monaco: 'viryx-hologram', body: '' },
  'midnight':       { monaco: 'midnight',       body: 'midnight' },
  'dracula':        { monaco: 'dracula',        body: 'dracula' },
  'one-dark':       { monaco: 'one-dark',       body: 'one-dark' },
  'github-dark':    { monaco: 'github-dark',    body: 'github-dark' },
  'synthwave':      { monaco: 'synthwave',      body: 'synthwave' },
};

// ─── Monaco Init ────────────────────────────────────────────
function initMonaco() {
  // Define custom Monaco themes
  monaco.editor.defineTheme('viryx-hologram', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword',   foreground: 'bd00ff', fontStyle: 'bold' },
      { token: 'string',    foreground: '00f0ff' },
      { token: 'number',    foreground: 'ffbd00' },
      { token: 'comment',   foreground: '4b506b', fontStyle: 'italic' },
      { token: 'type',      foreground: '00e5ff' },
      { token: 'function',  foreground: 'd533ff' },
      { token: 'variable',  foreground: 'e2e8f0' },
      { token: 'delimiter', foreground: '4f5c7a' },
    ],
    colors: {
      'editor.background':           '#06070d',
      'editor.foreground':           '#e2e8f0',
      'editorLineNumber.foreground': '#2a2d42',
      'editorLineNumber.activeForeground': '#00f0ff',
      'editor.lineHighlightBackground': '#0f1224',
      'editorCursor.foreground':     '#00f0ff',
      'editor.selectionBackground':  '#00f0ff25',
      'editor.findMatchBackground':  '#bd00ff40',
      'editorIndentGuide.background':'#181a29',
      'editorIndentGuide.activeBackground': '#2c2f4a',
      'scrollbar.shadow':            '#00000000',
      'scrollbarSlider.background':  '#00f0ff15',
      'scrollbarSlider.hoverBackground': '#00f0ff2c',
      'scrollbarSlider.activeBackground': '#00f0ff40',
      'minimap.background':          '#04050a',
      'editor.selectionHighlightBackground': '#00f0ff1a',
    }
  });

  monaco.editor.defineTheme('midnight', {
    base: 'vs-dark', inherit: true, rules: [
      { token: 'keyword', foreground: '7ca5ff', fontStyle: 'bold' },
      { token: 'string',  foreground: '90c4a8' },
      { token: 'comment', foreground: '3a3a5a', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#070710',
      'editor.foreground': '#d4d4ee',
      'editorLineNumber.foreground': '#22223a',
      'editorLineNumber.activeForeground': '#5b8af7',
      'editorCursor.foreground': '#5b8af7',
      'editor.selectionBackground': '#5b8af726',
      'editor.lineHighlightBackground': '#0c0c1a',
      'minimap.background': '#050510',
    }
  });

  monaco.editor.defineTheme('dracula', {
    base: 'vs-dark', inherit: true, rules: [
      { token: 'keyword',  foreground: 'ff79c6', fontStyle: 'bold' },
      { token: 'string',   foreground: 'f1fa8c' },
      { token: 'comment',  foreground: '6272a4', fontStyle: 'italic' },
      { token: 'function', foreground: '50fa7b' },
      { token: 'number',   foreground: 'bd93f9' },
    ],
    colors: {
      'editor.background': '#13141a',
      'editor.foreground': '#f8f8f2',
      'editorLineNumber.foreground': '#44475a',
      'editorLineNumber.activeForeground': '#bd93f9',
      'editorCursor.foreground': '#bd93f9',
      'editor.selectionBackground': '#44475a60',
      'editor.lineHighlightBackground': '#1c1d26',
      'minimap.background': '#0f1015',
    }
  });

  monaco.editor.defineTheme('one-dark', {
    base: 'vs-dark', inherit: true, rules: [
      { token: 'keyword',  foreground: 'c678dd', fontStyle: 'bold' },
      { token: 'string',   foreground: '98c379' },
      { token: 'comment',  foreground: '5c6370', fontStyle: 'italic' },
      { token: 'function', foreground: '61afef' },
      { token: 'number',   foreground: 'd19a66' },
    ],
    colors: {
      'editor.background': '#21252b',
      'editor.foreground': '#abb2bf',
      'editorLineNumber.foreground': '#4b5263',
      'editorLineNumber.activeForeground': '#61afef',
      'editorCursor.foreground': '#61afef',
      'editor.selectionBackground': '#3e4451',
      'editor.lineHighlightBackground': '#2c313a',
      'minimap.background': '#1d2026',
    }
  });

  monaco.editor.defineTheme('github-dark', {
    base: 'vs-dark', inherit: true, rules: [
      { token: 'keyword',  foreground: 'ff7b72', fontStyle: 'bold' },
      { token: 'string',   foreground: 'a5d6ff' },
      { token: 'comment',  foreground: '8b949e', fontStyle: 'italic' },
      { token: 'function', foreground: 'd2a8ff' },
      { token: 'number',   foreground: '79c0ff' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'editorLineNumber.foreground': '#30363d',
      'editorLineNumber.activeForeground': '#58a6ff',
      'editorCursor.foreground': '#58a6ff',
      'editor.selectionBackground': '#264f7840',
      'editor.lineHighlightBackground': '#161b22',
      'minimap.background': '#090e15',
    }
  });

  monaco.editor.defineTheme('synthwave', {
    base: 'vs-dark', inherit: true, rules: [
      { token: 'keyword',  foreground: 'f72585', fontStyle: 'bold' },
      { token: 'string',   foreground: '7209b7' },
      { token: 'comment',  foreground: '3a0060', fontStyle: 'italic' },
      { token: 'function', foreground: '4cc9f0' },
      { token: 'number',   foreground: 'f9c74f' },
      { token: 'type',     foreground: '90e0ef' },
    ],
    colors: {
      'editor.background': '#0a0015',
      'editor.foreground': '#e8d5ff',
      'editorLineNumber.foreground': '#2a0050',
      'editorLineNumber.activeForeground': '#f72585',
      'editorCursor.foreground': '#f72585',
      'editor.selectionBackground': '#f7258530',
      'editor.lineHighlightBackground': '#100020',
      'minimap.background': '#07000e',
    }
  });

  // Instantiating Monaco Editor
  editor = monaco.editor.create(document.getElementById('monaco-editor'), {
    theme: 'viryx-hologram',
    language: 'lua',
    fontSize: 14,
    fontFamily: '"JetBrains Mono", "Consolas", monospace',
    fontLigatures: true,
    lineNumbers: 'on',
    minimap: { enabled: true },
    wordWrap: 'off',
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderLineHighlight: 'line',
    scrollBeyondLastLine: false,
    roundedSelection: true,
    padding: { top: 10, bottom: 10 },
    folding: true,
    bracketPairColorization: { enabled: true },
    suggest: { showKeywords: true },
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    tabSize: 2,
    insertSpaces: true,
    formatOnPaste: true,
    renderWhitespace: 'none',
    occurrencesHighlight: true,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    glyphMargin: false,
    lineDecorationsWidth: 0,
    scrollbar: {
      verticalScrollbarSize: 5,
      horizontalScrollbarSize: 5,
    },
  });

  // Restore saved script tabs or launch first empty tab
  if (!restoreSavedScripts()) {
    createTab('untitled1.lua', DEFAULT_SCRIPT);
  }

  // Remove Loader Overlay
  const loader = document.getElementById('loading-overlay');
  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => loader.remove(), 400);
  }

  // Resize listener
  const resizeObserver = new ResizeObserver(() => editor.layout());
  resizeObserver.observe(document.getElementById('monaco-editor'));

  // Bind key combinations
  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 't') { e.preventDefault(); handleNewTabClick(); }
    if (e.ctrlKey && e.key === 'w') { e.preventDefault(); handleCloseActiveTab(); }
  });

  window.addEventListener('beforeunload', saveScriptsNow);
}

// ─── Tab Management ─────────────────────────────────────────
function createTab(name, initialContent = '') {
  const id = `tab-${++tabCounter}`;
  const model = monaco.editor.createModel(initialContent, 'lua');
  const contentListener = model.onDidChangeContent(scheduleScriptSave);
  tabs.set(id, { name, model, contentListener });

  const tabEl = document.createElement('div');
  tabEl.className = 'tab entering';
  tabEl.dataset.tabId = id;
  tabEl.innerHTML = `
    <span class="tab-name">${name}</span>
    <button class="tab-close" title="Close Tab">
      <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
      </svg>
    </button>
  `;

  tabEl.addEventListener('click', (e) => {
    if (!e.target.closest('.tab-close')) switchTab(id);
  });
  tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(id);
  });

  document.getElementById('tabs-container').appendChild(tabEl);
  setTimeout(() => tabEl.classList.remove('entering'), 200);

  switchTab(id);
  scheduleScriptSave();
  return id;
}

function switchTab(id) {
  if (!tabs.has(id)) return;
  activeTabId = id;
  const { name, model } = tabs.get(id);

  // Toggle active styling
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tabId === id);
  });

  // Switch Monaco Active View Model
  if (editor) editor.setModel(model);

  scheduleScriptSave();
}

function closeTab(id) {
  if (tabs.size === 1) return; // Keep at least one tab open
  const tabEl = document.querySelector(`.tab[data-tab-id="${id}"]`);
  if (tabEl) tabEl.remove();
  tabs.get(id)?.contentListener?.dispose();
  tabs.get(id)?.model.dispose();
  tabs.delete(id);

  if (activeTabId === id) {
    const remaining = [...tabs.keys()];
    if (remaining.length) switchTab(remaining[remaining.length - 1]);
  }

  scheduleScriptSave();
}

function handleNewTabClick() {
  const num = tabs.size + 1;
  createTab(`untitled${num}.lua`, '');
}

function handleCloseActiveTab() {
  closeTab(activeTabId);
}

function scheduleScriptSave() {
  if (isRestoringScripts) return;
  window.clearTimeout(scriptSaveTimer);
  scriptSaveTimer = window.setTimeout(saveScriptsNow, 250);
}

function saveScriptsNow() {
  if (!tabs.size) return;

  try {
    const tabEntries = [...tabs.entries()];
    const activeIndex = Math.max(0, tabEntries.findIndex(([id]) => id === activeTabId));
    const payload = {
      activeIndex,
      savedAt: new Date().toISOString(),
      tabs: tabEntries.map(([, tab]) => ({
        name: tab.name,
        content: tab.model.getValue(),
      })),
    };

    localStorage.setItem(SCRIPT_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to save scripts:', error);
  }
}

function restoreSavedScripts() {
  try {
    const raw = localStorage.getItem(SCRIPT_STORAGE_KEY);
    if (!raw) return false;

    const payload = JSON.parse(raw);
    if (!Array.isArray(payload.tabs) || payload.tabs.length === 0) return false;

    isRestoringScripts = true;
    const restoredIds = payload.tabs.map((tab, index) => createTab(
      tab.name || `untitled${index + 1}.lua`,
      typeof tab.content === 'string' ? tab.content : ''
    ));
    isRestoringScripts = false;

    const activeIndex = Number.isInteger(payload.activeIndex) ? payload.activeIndex : 0;
    const activeId = restoredIds[Math.min(Math.max(activeIndex, 0), restoredIds.length - 1)];
    if (activeId) switchTab(activeId);
    saveScriptsNow();
    return true;
  } catch (error) {
    isRestoringScripts = false;
    console.warn('Failed to restore scripts:', error);
    return false;
  }
}

// ─── Visual Theme Switcher ───────────────────────────────────
function applyTheme(name) {
  const theme = THEMES[name] || THEMES['viryx-hologram'];
  if (editor) monaco.editor.setTheme(theme.monaco);
  document.body.dataset.theme = theme.body;
  document.documentElement.dataset.theme = theme.body;
  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.toggle('active', card.dataset.theme === name);
  });
}

// ─── WebView2 exposed API ───────────────────────────────────
// Exposing window endpoints so C# Form buttons can control Monaco
window.getValue = function () {
  if (editor) return editor.getValue();
  return '';
};

window.setValue = function (value) {
  if (editor) {
    editor.setValue(value || '');
    return true;
  }
  return false;
};

window.addTab = function (name, content) {
  const tabId = createTab(name || `untitled${tabs.size + 1}.lua`, content || '');
  return tabId;
};

window.setTheme = function (themeName) {
  if (THEMES[themeName]) {
    applyTheme(themeName);
    return true;
  }
  return false;
};

window.setFontSize = function (size) {
  const val = parseInt(size);
  if (editor && !isNaN(val)) {
    editor.updateOptions({ fontSize: val });
    
    // Sync settings slider if page is active
    const slider = document.getElementById('setting-font-size');
    const valText = document.getElementById('setting-font-size-val');
    if (slider) slider.value = val;
    if (valText) valText.textContent = `${val}px`;
    return true;
  }
  return false;
};

window.setWordWrap = function (enabled) {
  const mode = enabled ? 'on' : 'off';
  if (editor) {
    editor.updateOptions({ wordWrap: mode });
    
    // Sync settings checkbox
    const chk = document.getElementById('setting-wordwrap');
    if (chk) chk.checked = Boolean(enabled);
    return true;
  }
  return false;
};

window.setMinimap = function (enabled) {
  if (editor) {
    editor.updateOptions({ minimap: { enabled: Boolean(enabled) } });
    
    // Sync settings checkbox
    const chk = document.getElementById('setting-minimap');
    if (chk) chk.checked = Boolean(enabled);
    return true;
  }
  return false;
};

window.setLineNumbers = function (enabled) {
  const mode = enabled ? 'on' : 'off';
  if (editor) {
    editor.updateOptions({ lineNumbers: mode });
    
    // Sync settings checkbox
    const chk = document.getElementById('setting-linenums');
    if (chk) chk.checked = Boolean(enabled);
    return true;
  }
  return false;
};

window.clearEditor = function () {
  if (editor) {
    editor.setValue('');
    return true;
  }
  return false;
};

window.getActiveTabName = function () {
  const activeTab = tabs.get(activeTabId);
  return activeTab ? activeTab.name : '';
};

// ─── Settings Modal & Form Handlers ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // New tab listener
  document.getElementById('btn-add-tab').addEventListener('click', handleNewTabClick);

  // Settings modals
  const settingsModal = document.getElementById('settings-modal');
  const btnSettings = document.getElementById('btn-settings');
  const btnCloseSettings = document.getElementById('settings-modal-close');

  btnSettings.addEventListener('click', () => settingsModal.classList.add('open'));
  btnCloseSettings.addEventListener('click', () => settingsModal.classList.remove('open'));
  
  settingsModal.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });

  // Slider font sizes
  const fontSizeSlider = document.getElementById('setting-font-size');
  const fontSizeVal    = document.getElementById('setting-font-size-val');
  fontSizeSlider.addEventListener('input', () => {
    const v = fontSizeSlider.value;
    fontSizeVal.textContent = `${v}px`;
    if (editor) editor.updateOptions({ fontSize: parseInt(v) });
  });

  // Slider UI opacity
  const opacitySlider = document.getElementById('setting-opacity');
  const opacityVal    = document.getElementById('setting-opacity-val');
  opacitySlider.addEventListener('input', () => {
    const v = opacitySlider.value;
    opacityVal.textContent = `${v}%`;
    document.body.style.opacity = v / 100;
  });

  // Fonts select
  document.getElementById('setting-font').addEventListener('change', (e) => {
    if (editor) editor.updateOptions({ fontFamily: `"${e.target.value}", monospace` });
  });

  // Toggles
  document.getElementById('setting-wordwrap').addEventListener('change', (e) => {
    if (editor) editor.updateOptions({ wordWrap: e.target.checked ? 'on' : 'off' });
  });

  document.getElementById('setting-minimap').addEventListener('change', (e) => {
    if (editor) editor.updateOptions({ minimap: { enabled: e.target.checked } });
  });

  document.getElementById('setting-linenums').addEventListener('change', (e) => {
    if (editor) editor.updateOptions({ lineNumbers: e.target.checked ? 'on' : 'off' });
  });

  // Theme card selections
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => applyTheme(card.dataset.theme));
  });
});
