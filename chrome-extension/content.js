/* 
 * LinkedIn Auto-Connect Content Script v3
 * State-machine using chrome.storage to survive page navigations.
 * Checks state IMMEDIATELY on load (no window.load event dependency).
 */

const STORAGE_KEY = 'li_autoconnect_session';

function updateStatus(text, type = 'info') {
  try {
    chrome.runtime.sendMessage({ action: "UPDATE_STATUS", text, type });
  } catch(e) {}
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// ─────────────────────────────────────────────────────────
// LISTEN for START / STOP from popup
// ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_CONNECT") {
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
      setTimeout(() => runSearchPageFlow(session), 2000);
    });
    return true;
  }

  if (request.action === "STOP_CONNECT") {
    chrome.storage.local.remove(STORAGE_KEY);
    updateStatus('⏹ Stopped.');
    sendResponse({ status: "STOPPED" });
  }
});

// ─────────────────────────────────────────────────────────
// IMMEDIATELY on script load — check state and act
// ─────────────────────────────────────────────────────────
(function init() {
  const url = window.location.href;
  console.log('[AutoConnect] Content script loaded on:', url);

  chrome.storage.local.get(STORAGE_KEY, (data) => {
    const session = data[STORAGE_KEY];
    if (!session || !session.active) {
      console.log('[AutoConnect] No active session.');
      return;
    }

    console.log('[AutoConnect] Active session found:', session);

    // Case 1: Custom invite redirect page — click Send
    if (url.includes('/preload/custom-invite/')) {
      console.log('[AutoConnect] On invite page. Clicking Send...');
      handleInvitePage(session);
    }
    // Case 2: Back on search results — continue
    else if (url.includes('/search/results/people/')) {
      console.log('[AutoConnect] Back on search page. Continuing...');
      setTimeout(() => runSearchPageFlow(session), 3000);
    }
  });
})();

// ─────────────────────────────────────────────────────────
// SEARCH PAGE: Click connect on the next lead
// ─────────────────────────────────────────────────────────
async function runSearchPageFlow(session) {
  if (!session.active) return;

  if (session.sent >= session.limit) {
    updateStatus(`✅ Done! Sent ${session.sent} requests.`);
    chrome.storage.local.remove(STORAGE_KEY);
    return;
  }

  updateStatus(`🔍 Scanning leads... (${session.sent}/${session.limit} sent)`);
  await sleep(2000);

  const connectButtons = getConnectButtons();
  console.log(`[AutoConnect] Found ${connectButtons.length} connect buttons, index: ${session.currentIndex}`);

  if (connectButtons.length === 0) {
    updateStatus('⚠️ No connect buttons found on this page.', 'error');
    return;
  }

  const btn = connectButtons[session.currentIndex];
  if (!btn) {
    updateStatus(`✅ Done! Sent ${session.sent} requests.`);
    chrome.storage.local.remove(STORAGE_KEY);
    return;
  }

  const name = btn.getAttribute('aria-label')
    ?.replace('Invite ', '').replace(' to connect', '') || 'someone';

  updateStatus(`🤝 Connecting with ${name}...`);
  console.log(`[AutoConnect] Clicking connect for: ${name}`);

  // Save state BEFORE clicking (page may navigate away)
  const updatedSession = {
    ...session,
    currentIndex: session.currentIndex + 1,
    returnUrl: window.location.href
  };
  await new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEY]: updatedSession }, resolve);
  });

  btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(1000);
  btn.click();

  // Check if a modal appeared on THIS page (some profiles use a popup)
  const sendBtn = await waitForSendButton(4000);
  if (sendBtn) {
    console.log('[AutoConnect] Modal found on same page! Clicking Send...');
    sendBtn.click();
    const newSession = { ...updatedSession, sent: updatedSession.sent + 1 };
    chrome.storage.local.set({ [STORAGE_KEY]: newSession });
    updateStatus(`✅ Sent! (${newSession.sent}/${newSession.limit}). Waiting...`);
    await sleep(randomDelay(newSession.delayMin, newSession.delayMax));
    runSearchPageFlow(newSession);
  }
  // else: navigated away → handleInvitePage() will pick up on next page load
}

// ─────────────────────────────────────────────────────────
// INVITE PAGE: Click Send, then navigate back to search
// ─────────────────────────────────────────────────────────
async function handleInvitePage(session) {
  updateStatus('📨 On invite page — clicking Send...');
  
  const sendBtn = await waitForSendButton(10000);
  
  if (sendBtn) {
    console.log('[AutoConnect] Found Send button:', sendBtn.innerText);
    sendBtn.click();
    const updatedSession = { ...session, sent: session.sent + 1 };
    chrome.storage.local.set({ [STORAGE_KEY]: updatedSession });
    updateStatus(`✅ Request sent! (${updatedSession.sent}/${updatedSession.limit}) Going back...`);
    
    const delay = randomDelay(session.delayMin, session.delayMax);
    console.log(`[AutoConnect] Waiting ${delay}ms then navigating back to: ${session.returnUrl}`);
    await sleep(delay);
    
    // Navigate directly back to the search results (more reliable than history.back)
    window.location.href = session.returnUrl;
  } else {
    console.log('[AutoConnect] Could NOT find Send button. Going back anyway.');
    updateStatus('⚠️ Could not find Send button.', 'error');
    await sleep(2000);
    window.location.href = session.returnUrl;
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
      const isSend = t.includes('send without a note') || l.includes('send without a note') ||
                     (t.trim() === 'send' && !t.includes('feedback') && !t.includes('message'));
      return isSend && b.offsetParent !== null;
    });
    if (found) {
      console.log('[AutoConnect] Send button found:', found.innerText);
      return found;
    }
    await sleep(400);
  }
  console.log('[AutoConnect] Send button NOT found after timeout.');
  return null;
}
