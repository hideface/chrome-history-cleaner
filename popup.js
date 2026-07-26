const DEFAULT_SETTINGS = {
  clearOnLastWindowClosed: true,
  clearOnStartup: true
};

const closeSetting = document.querySelector("#clearOnLastWindowClosed");
const startupSetting = document.querySelector("#clearOnStartup");
const clearButton = document.querySelector("#clearNow");
const status = document.querySelector("#status");
let clearing = false;

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

async function initialize() {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  closeSetting.checked = settings.clearOnLastWindowClosed;
  startupSetting.checked = settings.clearOnStartup;

  if (settings.lastClearAt) {
    showStatus(`최근 삭제: ${new Date(settings.lastClearAt).toLocaleString("ko-KR")}`);
  }
  if (settings.lastClearError) {
    showStatus(`삭제 오류: ${settings.lastClearError}`, true);
  }
}

closeSetting.addEventListener("change", async () => {
  await chrome.storage.local.set({
    clearOnLastWindowClosed: closeSetting.checked
  });
  showStatus("설정을 저장했습니다.");
});

startupSetting.addEventListener("change", async () => {
  await chrome.storage.local.set({ clearOnStartup: startupSetting.checked });
  showStatus("설정을 저장했습니다.");
});

async function clearAllExceptLogin() {
  if (clearing) {
    return;
  }

  clearing = true;
  clearButton.disabled = true;
  showStatus("전체 기간의 기록을 삭제 중입니다…");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "clear-all-except-login"
    });

    if (!response?.ok) {
      throw new Error(response?.error || "알 수 없는 오류");
    }
    showStatus("삭제했습니다. 로그인 상태와 다운로드 파일은 유지됩니다.");
  } catch (error) {
    showStatus(`삭제하지 못했습니다: ${error.message}`, true);
  } finally {
    clearButton.disabled = false;
    clearing = false;
  }
}

clearButton.addEventListener("click", clearAllExceptLogin);

initialize()
  .then(clearAllExceptLogin)
  .catch((error) => {
    showStatus(`실행하지 못했습니다: ${error.message}`, true);
  });
