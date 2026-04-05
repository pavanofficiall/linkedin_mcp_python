/* 
 * LinkedIn Auto-Connect Popup Script v4
 * Save session to storage FIRST, then navigate.
 * No message sending needed - content script reads storage on load.
 */

const STORAGE_KEY = 'li_autoconnect_session';
const statusText = document.getElementById('statusText');

function setStatus(text, color = 'white') {
  statusText.innerText = text;
  statusText.style.color = color;
}

// Listen for status updates from content script
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "UPDATE_STATUS") {
    setStatus(request.text, request.type === 'error' ? '#ff8a80' : 'white');
  }
});

document.getElementById('startBtn').addEventListener('click', () => {
  const query = document.getElementById('searchQuery').value.trim();
  const limit = parseInt(document.getElementById('limit').value) || 10;
  const delay = parseInt(document.getElementById('delay').value) || 8000;

  if (!query) {
    setStatus('⚠️ Enter a search query first!', '#FFD700');
    return;
  }

  const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;

  // 1. Save session to storage FIRST
  const session = {
    active: true,
    currentIndex: 0,
    limit: limit,
    delayMin: Math.max(3000, delay - 3000),
    delayMax: delay + 3000,
    sent: 0,
    returnUrl: searchUrl
  };

  chrome.storage.local.set({ [STORAGE_KEY]: session }, () => {
    setStatus('🔍 Navigating to search...', '#FFD700');
    // 2. Then navigate — content script will pick up the session automatically
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.update(tabs[0].id, { url: searchUrl });
    });
  });
});

document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.storage.local.remove(STORAGE_KEY);
  setStatus('⏹ Stopped.');
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "STOP_CONNECT" });
  });
});
