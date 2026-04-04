/* 
 * LinkedIn Auto-Connect Content Script
 * ------------------------------------
 * Monitors the page for Connect buttons and simulates 
 * human-like clicks.
 */

console.log("LinkedIn Auto-Connect Extension loaded!");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_CONNECT") {
    autoConnect(request.options);
    sendResponse({ status: "STARTED" });
  } else if (request.action === "STOP_CONNECT") {
    stopConnection = true;
    sendResponse({ status: "STOPPING" });
  }
});

let stopConnection = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateStatus(text, type = 'info') {
  chrome.runtime.sendMessage({ action: "UPDATE_STATUS", text, type });
}

async function autoConnect(options) {
  stopConnection = false;
  const { delayMin = 5000, delayMax = 15000, limit = 10 } = options;
  
  updateStatus(`Scanning for buttons...`);
  
  let count = 0;
  
  const findConnectButtons = () => {
    return Array.from(document.querySelectorAll('button, a'))
      .filter(b => {
        const label = (b.getAttribute('aria-label') || '').toLowerCase();
        const text = (b.innerText || '').toLowerCase();
        if (text.includes("pending") || text.includes("message") || text.includes("following")) return false;
        
        return (label.includes('connect') && !label.includes('message')) || 
               (text.trim() === 'connect') || (text.trim() === '+ connect');
      });
  };

  let connectButtons = findConnectButtons();
  updateStatus(`Found ${connectButtons.length} buttons.`);
  await new Promise(r => setTimeout(r, 2000));

  for (let btn of connectButtons) {
    if (stopConnection) break;
    if (count >= limit) break;

    try {
      const name = btn.getAttribute('aria-label')?.split('Invite ')[1]?.split(' to connect')[0] || "someone";
      updateStatus(`Inviting ${name}... (${count + 1}/${limit})`);
      
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 2000));

      btn.click();
      count++;

      await new Promise(r => setTimeout(r, 2500));

      const dialogButtons = Array.from(document.querySelectorAll('button'));
      const sendBtn = dialogButtons.find(b => {
        const t = (b.innerText || '').toLowerCase();
        const l = (b.getAttribute('aria-label') || '').toLowerCase();
        return t.includes("send without a note") || t.trim() === "send" || l.includes("send invitation");
      });

      if (sendBtn) {
        sendBtn.click();
        await new Promise(r => setTimeout(r, 2000));
      }

      const nextDelay = Math.floor(Math.random() * (delayMax - delayMin)) + delayMin;
      updateStatus(`Waiting ${Math.round(nextDelay/1000)}s...`);
      await new Promise(r => setTimeout(r, nextDelay));

    } catch (err) {
      console.error("Error clicking button:", err);
    }
  }

  updateStatus(`Sent ${count} requests! Done.`);
}
