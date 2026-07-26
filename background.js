const DEFAULT_SETTINGS = {
  clearOnLastWindowClosed: true,
  clearOnStartup: true
};

async function getSettings() {
  return chrome.storage.local.get(DEFAULT_SETTINGS);
}

async function clearHistory(reason) {
  try {
    await chrome.browsingData.remove(
      { since: 0 },
      {
        history: true,
        formData: true
      }
    );
    await chrome.storage.local.set({
      lastClearAt: Date.now(),
      lastClearReason: reason,
      lastClearError: ""
    });
  } catch (error) {
    await chrome.storage.local.set({
      lastClearError: error instanceof Error ? error.message : String(error)
    });
  }
}

async function clearAllExceptLogin(reason) {
  try {
    await chrome.browsingData.remove(
      { since: 0 },
      {
        cache: true,
        downloads: true,
        formData: true,
        history: true
      }
    );
    await chrome.storage.local.set({
      lastClearAt: Date.now(),
      lastClearReason: reason,
      lastClearError: ""
    });
  } catch (error) {
    await chrome.storage.local.set({
      lastClearError: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  await chrome.storage.local.set({ ...DEFAULT_SETTINGS, ...current });
});

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  if (settings.clearOnStartup) {
    await clearHistory("startup");
  }
});

chrome.windows.onRemoved.addListener(async () => {
  const settings = await getSettings();
  if (!settings.clearOnLastWindowClosed) {
    return;
  }

  const remainingWindows = await chrome.windows.getAll({
    windowTypes: ["normal", "popup"]
  });

  if (remainingWindows.length === 0) {
    await clearHistory("last-window-closed");
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "clear-all-except-login") {
    return false;
  }

  clearAllExceptLogin("toolbar-click")
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: String(error) }));

  return true;
});
