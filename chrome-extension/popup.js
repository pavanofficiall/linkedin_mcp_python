/* 
 * LinkedIn Auto-Connect Popup Script
 */

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

document.getElementById('startBtn').addEventListener('click', async () => {
  const query = document.getElementById('searchQuery').value.trim();
  const limit = parseInt(document.getElementById('limit').value) || 10;
  const delay = parseInt(document.getElementById('delay').value) || 8000;

  if (!query) {
    setStatus('⚠️ Please enter a search query!', '#FFD700');
    return;
  }

  setStatus('🔍 Searching LinkedIn...', '#FFD700');

  // Build the LinkedIn People search URL
  const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;

  // Get the current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tabId = tabs[0].id;

    // Navigate current tab to the search results page
    chrome.tabs.update(tabId, { url: searchUrl }, function () {
      // Wait for the page to load, then start auto-connecting
      chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          
          setStatus('🤖 Starting auto-connect...', '#FFD700');

          // Small delay to let LinkedIn fully render
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, {
              action: "START_CONNECT",
              options: {
                limit: limit,
                delayMin: Math.max(3000, delay - 3000),
                delayMax: delay + 3000
              }
            }, function (response) {
              if (chrome.runtime.lastError) {
                setStatus('⚠️ Error: Refresh and try again!', '#ff8a80');
              }
            });
          }, 3000);
        }
      });
    });
  });
});

document.getElementById('stopBtn').addEventListener('click', () => {
  setStatus('⏹ Stopped.', 'lightgrey');
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "STOP_CONNECT" });
    }
  });
});
