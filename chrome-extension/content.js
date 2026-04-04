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
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: "UPDATE_STATUS", text, type }).catch(() => {});
  }
}

async function waitForElement(selector, textMatch, timeout = 10000) {
  const start = Date.now();
  console.log(`Starting wait for: ${textMatch}`);
  while (Date.now() - start < timeout) {
    // Search in ALL elements first, then narrow down if needed
    const allElements = Array.from(document.querySelectorAll(selector + ', .artdeco-button--primary, .artdeco-button--solid'));
    const found = allElements.find(el => {
      const t = (el.innerText || '').toLowerCase();
      const l = (el.getAttribute('aria-label') || '').toLowerCase();
      const c = (el.className || '').toLowerCase();
      
      const match = t.includes(textMatch.toLowerCase()) || 
                    l.includes(textMatch.toLowerCase()) ||
                    (textMatch === 'send' && (c.includes('send') || t.includes('without a note')));
      
      return match && el.offsetParent !== null; // Must be visible
    });
    if (found) {
        console.log(`Found element: ${found.innerText}`);
        return found;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return null;
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
        if (text.includes("pending") || text.includes("message") || text.includes("following") || text.includes("withdraw")) return false;
        
        return (label.includes('connect') && !label.includes('message')) || 
               (text.trim() === 'connect') || (text.trim() === '+ connect') ||
               (label.startsWith('invite') && label.endsWith('to connect'));
      });
  };

  let connectButtons = findConnectButtons();
  updateStatus(`Found ${connectButtons.length} potential leads.`);
  await new Promise(r => setTimeout(r, 2000));

  for (let btn of connectButtons) {
    if (stopConnection) break;
    if (count >= limit) break;

    try {
      const name = btn.getAttribute('aria-label')?.split('Invite ')[1]?.split(' to connect')[0] || "someone";
      updateStatus(`Connecting with ${name}...`);
      
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 1500));

      btn.click();
      
      // Wait for the Send button to appear in the popup
      const sendBtn = await waitForElement('button', 'send');
      
      if (sendBtn) {
        updateStatus(`Finalizing request to ${name}...`);
        sendBtn.click();
        count++;
        await new Promise(r => setTimeout(r, 2000));
      } else {
          // Check if maybe it was sent automatically (button text changed to Pending)
          await new Promise(r => setTimeout(r, 2000));
          const textAfter = (btn.innerText || '').toLowerCase();
          if (textAfter.includes('pending') || textAfter.includes('withdraw')) {
              count++;
              updateStatus(`Success (Auto-sent)!`);
          } else {
              updateStatus(`Could not find Send button.`, 'error');
          }
      }

      // Check for success/dismissal popups like "Got it"
      const doneBtn = await waitForElement('button', 'done', 2000);
      if (doneBtn) doneBtn.click();

      const nextDelay = Math.floor(Math.random() * (delayMax - delayMin)) + delayMin;
      updateStatus(`Success! Waiting ${Math.round(nextDelay/1000)}s...`);
      await new Promise(r => setTimeout(r, nextDelay));

    } catch (err) {
      console.error("Error:", err);
      updateStatus("Error clicking button.", "error");
    }
  }

  updateStatus(`Sent ${count} requests! Done.`);
}
