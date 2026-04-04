/* 
 * LinkedIn Auto-Connect Popup Script
 * ----------------------------------
 * Handles messaging between the popup and the content script.
 */

document.getElementById('startBtn').addEventListener('click', () => {
    const limit = parseInt(document.getElementById('limit').value) || 10;
    const delay = parseInt(document.getElementById('delay').value) || 8000;
    const statusText = document.getElementById('statusText');
    
    statusText.innerText = "Initializing...";
    statusText.style.color = "#FFD700";
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0 || !tabs[0].url.includes('linkedin.com')) {
        statusText.innerText = "Error: Not on LinkedIn!";
        statusText.style.color = "red";
        return;
      }
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "START_CONNECT",
        options: {
          limit: limit,
          delayMin: Math.max(2000, delay - 3000),
          delayMax: delay + 3000
        }
      }, function(response) {
        if (chrome.runtime.lastError) {
          statusText.innerText = "Error: Refresh the page!";
          statusText.style.color = "red";
          console.error(chrome.runtime.lastError);
        }
      });
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "UPDATE_STATUS") {
        const statusText = document.getElementById('statusText');
        statusText.innerText = request.text;
        if (request.type === 'error') statusText.style.color = 'red';
        else statusText.style.color = 'white';
    }
});

document.getElementById('stopBtn').addEventListener('click', () => {
    const statusText = document.getElementById('statusText');
    statusText.innerText = "Stopped!";
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "STOP_CONNECT" });
        }
    });
});
