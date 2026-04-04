/* 
 * LinkedIn Auto-Connect Popup Script
 * ----------------------------------
 * Handles messaging between the popup and the content script.
 */

document.getElementById('startBtn').addEventListener('click', () => {
    const limit = parseInt(document.getElementById('limit').value) || 10;
    const delay = parseInt(document.getElementById('delay').value) || 8000;
    const statusText = document.getElementById('statusText');
    
    // Status update
    statusText.innerText = "Connecting...";
    statusText.style.color = "#FFD700"; // Golden
    
    // Send message to current tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "START_CONNECT",
          options: {
            limit: limit,
            delayMin: delay - 2000,
            delayMax: delay + 4000
          }
        }, function(response) {
            console.log("Success:", response);
        });
      }
    });
});

document.getElementById('stopBtn').addEventListener('click', () => {
    const statusText = document.getElementById('statusText');
    statusText.innerText = "Stopped!";
    statusText.style.color = "lightgrey";
    
    // Send stop message
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "STOP_CONNECT" });
        }
    });
});
