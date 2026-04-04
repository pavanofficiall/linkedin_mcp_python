/* 
 * LinkedIn Auto-Connect Content Script
 * State-based approach using chrome.storage to survive page navigations.
 */

const STORAGE_KEY = 'li_autoconnect_session';

function updateStatus(text, type = 'info') {
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: "UPDATE_STATUS", text, type }).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────
// MESSAGE LISTENER — START / STOP from popup
// ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_CONNECT") {
    // Save session to storage and begin
    const session = {
      active: true,
      currentIndex: 0,
      limit: request.options.limit || 10,
      delayMin: request.options.delayMin || 5000,
      delayMax: request.options.delayMax || 12000,
      sent: 0,
      returnUrl: window.location.href
    };
    chrome.storage.local.set({ [STORAGE_KEY]: session }, () => {
      sendResponse({ status: "STARTED" });
      runSearchPageFlow(session);
    });
    return true; // Keep channel open for async sendResponse
  }

  if (request.action === "STOP_CONNECT") {
    chrome.storage.local.remove(STORAGE_KEY);
    updateStatus('⏹ Stopped.');
    sendResponse({ status: "STOPPED" });
  }
});

// ─────────────────────────────────────────────────────────
// ON PAGE LOAD — decide what to do based on current URL
// ─────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  chrome.storage.local.get(STORAGE_KEY, (data) => {
    const session = data[STORAGE_KEY];
    if (!session || !session.active) return;

    const url = window.location.href;

    // Case 1: We're on the custom-invite redirect page → click Send
    if (url.includes('/preload/custom-invite/') || url.includes('/in/') && url.includes('invite')) {
      handleInvitePage(session);
    }
    // Case 2: We're back on the search results page → continue loop
    else if (url.includes('/search/results/people/')) {
      // Small delay to let the page render fully
      setTimeout(() => runSearchPageFlow(session), 3000);
    }
  });
});

// ─────────────────────────────────────────────────────────
// SEARCH PAGE: Find connect buttons and click the right one
// ─────────────────────────────────────────────────────────
async function runSearchPageFlow(session) {
  if (!session.active) return;

  if (session.sent >= session.limit) {
    updateStatus(`✅ Done! Sent ${session.sent} requests.`);
    chrome.storage.local.remove(STORAGE_KEY);
    return;
  }

  updateStatus(`🔍 Finding leads... (${session.sent}/${session.limit} sent)`);

  // Wait for results to load
  await sleep(2000);

  const connectButtons = getConnectButtons();
  console.log(`Found ${connectButtons.length} connect buttons, targeting index ${session.currentIndex}`);

  if (connectButtons.length === 0) {
    updateStatus('⚠️ No connect buttons found. Scroll down?', 'error');
    return;
  }

  const btn = connectButtons[session.currentIndex];
  if (!btn) {
    updateStatus(`✅ Done! Sent ${session.sent} requests.`);
    chrome.storage.local.remove(STORAGE_KEY);
    return;
  }

  const name = btn.getAttribute('aria-label')?.replace('Invite ', '').replace(' to connect', '') || 'someone';
  updateStatus(`🤝 Connecting with ${name}...`);

  btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(1500);

  // Save incremented index BEFORE clicking (in case of navigation)
  const updatedSession = {
    ...session,
    currentIndex: session.currentIndex + 1,
    returnUrl: window.location.href
  };
  chrome.storage.local.set({ [STORAGE_KEY]: updatedSession });

  btn.click();

  // Wait to see if a popup appears on THIS page (some profiles show a modal)
  const sendBtn = await waitForSendButton(5000);
  if (sendBtn) {
    sendBtn.click();
    const newSession = { ...updatedSession, sent: updatedSession.sent + 1 };
    chrome.storage.local.set({ [STORAGE_KEY]: newSession });
    updateStatus(`✅ Sent! (${newSession.sent}/${newSession.limit}). Waiting...`);
    const delay = randomDelay(newSession.delayMin, newSession.delayMax);
    await sleep(delay);
    runSearchPageFlow(newSession);
  }
  // else: page navigated away, handleInvitePage will take over
}

// ─────────────────────────────────────────────────────────
// INVITE PAGE: Click Send and go back
// ─────────────────────────────────────────────────────────
async function handleInvitePage(session) {
  updateStatus('📨 On invite page — sending...');
  
  const sendBtn = await waitForSendButton(10000);
  if (sendBtn) {
    sendBtn.click();
    const updatedSession = { ...session, sent: session.sent + 1 };
    chrome.storage.local.set({ [STORAGE_KEY]: updatedSession });
    updateStatus(`✅ Sent! (${updatedSession.sent}/${updatedSession.limit}). Going back...`);
    
    // Wait the human-like delay THEN go back to search results
    const delay = randomDelay(session.delayMin, session.delayMax);
    await sleep(delay);
    window.history.back();
  } else {
    updateStatus('⚠️ Could not find Send button on invite page.', 'error');
    // Still go back to continue with next lead
    await sleep(3000);
    window.history.back();
  }
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function getConnectButtons() {
  return Array.from(document.querySelectorAll('button, a'))
    .filter(b => {
      const label = (b.getAttribute('aria-label') || '').toLowerCase();
      const text = (b.innerText || '').toLowerCase().trim();
      if (['pending', 'message', 'following', 'withdraw'].some(w => text.includes(w))) return false;
      return label.startsWith('invite') && label.endsWith('to connect');
    });
}

async function waitForSendButton(timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const allBtns = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    const found = allBtns.find(b => {
      const t = (b.innerText || '').toLowerCase();
      const l = (b.getAttribute('aria-label') || '').toLowerCase();
      return (t.includes('send without a note') || 
              (t.includes('send') && !t.includes('feedback') && !t.includes('message') && !t.includes('report'))) &&
             b.offsetParent !== null;
    });
    if (found) return found;
    await sleep(400);
  }
  return null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
