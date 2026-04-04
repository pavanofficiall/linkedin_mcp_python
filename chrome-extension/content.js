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

async def sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function autoConnect(options) {
  stopConnection = false;
  const { delayMin = 5000, delayMax = 15000, limit = 10 } = options;
  
  console.log(`Starting auto-connect. Limit: ${limit}, Delay: ${delayMin}-${delayMax}ms`);
  
  let count = 0;
  
  // Find all Connect buttons on the current page
  // We look for buttons that have 'Connect' text or specific aria-labels
  const findConnectButtons = () => {
    return Array.from(document.querySelectorAll('button, a'))
      .filter(b => {
        const label = (b.getAttribute('aria-label') || '').toLowerCase();
        const text = (b.innerText || '').toLowerCase();
        // Specifically avoid "Message", "Following", "Pending"
        if (text.includes("pending") || text.includes("message") || text.includes("following")) return false;
        
        return (label.includes('connect') && !label.includes('message')) || 
               (text.trim() === 'connect') || (text.trim() === '+ connect');
      });
  };

  let connectButtons = findConnectButtons();
  console.log(`Found ${connectButtons.length} connect buttons.`);

  for (let btn of connectButtons) {
    if (stopConnection) break;
    if (count >= limit) break;

    try {
      console.log(`Attempting to connect with person ${count + 1}...`);
      
      // 1. Scroll to button like a human
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const delayNode = Math.floor(Math.random() * (2000)) + 1000;
      await new Promise(r => setTimeout(r, delayNode));

      // 2. Click Connect
      btn.click();
      count++;

      // 3. Wait for the popup
      await new Promise(r => setTimeout(r, 2000));

      // 4. Handle "Send without a note" or "Send"
      const dialogButtons = Array.from(document.querySelectorAll('button'));
      const sendBtn = dialogButtons.find(b => {
        const t = (b.innerText || '').toLowerCase();
        const l = (b.getAttribute('aria-label') || '').toLowerCase();
        return t.includes("send without a note") || t.trim() === "send" || l.includes("send invitation");
      });

      if (sendBtn) {
        console.log("Confirmation popup found. Clicking 'Send'...");
        sendBtn.click();
        await new Promise(r => setTimeout(r, 1500));
      }

      // 5. Random Delay between requests
      const nextDelay = Math.floor(Math.random() * (delayMax - delayMin)) + delayMin;
      console.log(`Waiting ${nextDelay}ms until next connection...`);
      await new Promise(r => setTimeout(r, nextDelay));

    } catch (err) {
      console.error("Error clicking button:", err);
    }
  }

  console.log(`Auto-connect finished. Total sent: ${count}`);
  alert(`Auto-connect finished. Sent ${count} requests.`);
}
