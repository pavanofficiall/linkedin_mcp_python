import os
import logging
import asyncio
from playwright.async_api import async_playwright
from .linkedin_login import ensure_linkedin_login, STORAGE_STATE_PATH

async def send_connection_request(
    profile_url: str,
    message: str = None,
    username: str = None,
    password: str = None
) -> str:
    """
    Send a connection request to a LinkedIn user.
    
    Args:
        profile_url: LinkedIn profile URL (e.g., "https://www.linkedin.com/in/username/")
        message: Optional connection request message (max 180 characters)
        username: LinkedIn username/email (optional, falls back to env var)
        password: LinkedIn password (optional, falls back to env var)
    
    Returns:
        String indicating success or failure of the connection request
    """
    linkedin_username = username or os.getenv("LINKEDIN_USERNAME")
    linkedin_password = password or os.getenv("LINKEDIN_PASSWORD")
    logger = logging.getLogger(__name__)
    
    if not linkedin_username or not linkedin_password:
        return "Missing LinkedIn credentials. Please provide username and password parameters or set LINKEDIN_USERNAME and LINKEDIN_PASSWORD environment variables."
    
    if not profile_url:
        return "Error: profile_url is required."
    
    # Validate profile URL
    if not profile_url.startswith("https://www.linkedin.com/in/"):
        return "Error: Invalid LinkedIn profile URL. URL should start with 'https://www.linkedin.com/in/'"
    
    # Validate message length if provided
    if message and len(message) > 200:  # For safety
        return f"Error: Message too long ({len(message)} characters). Maximum allowed is 200 characters."

    logger.info(f"Starting connection request to profile: {profile_url}")
    if message:
        logger.info(f"With message: {message}")
    
    async with async_playwright() as p:
        try:
            logger.info("Launching Playwright browser...")
            context_args = {}
            if os.path.exists(STORAGE_STATE_PATH):
                context_args['storage_state'] = STORAGE_STATE_PATH
            
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(**context_args)
            page = await context.new_page()
            
            # Login to LinkedIn
            logged_in = await ensure_linkedin_login(page, linkedin_username, linkedin_password)
            if not logged_in:
                await browser.close()
                return "Login failed or took too long."
            
            # Navigate to the profile URL
            logger.info(f"Navigating to profile: {profile_url}")
            await page.goto(profile_url, wait_until='domcontentloaded')
            
            # Wait for specific visual elements that indicate the profile is ready
            try:
                await page.wait_for_selector(".pvs-profile-actions, div.ph5, main.scaffold-layout__main", timeout=15000)
                logger.info("Main profile elements detected.")
            except:
                logger.warning("Main profile elements not detected within 15s, proceeding anyway.")
            
            await asyncio.sleep(2)
            
            # TAKE A DEBUG SCREENSHOT IMMEDIATELY
            await page.screenshot(path="profile_loaded.png")
            logger.info("Profile page loaded, screenshot saved to profile_loaded.png")

            # Check for "Pending" or "Withdraw" (already sent request)
            pending_button = await page.query_selector('main button:has-text("Pending"), main button:has-text("Withdraw")')
            if pending_button:
                logger.info("Connection request already pending. Skipping...")
                await browser.close()
                return "Connection request already pending. Skipping..."

            # 2. Check for "Message" button with icon (already connected)
            more_button = await page.wait_for_selector('main button:has-text("More")', timeout=10000)

            # Get the parent container of the 'More' button (typically the div holding all main action buttons)
            grandparent = await more_button.evaluate_handle('el => el.parentElement.parentElement')

            # Count the number of buttons inside this grandparent container
            main_action_buttons_count = await grandparent.evaluate('el => el.querySelectorAll("button").length')

            if main_action_buttons_count == 2:
                await browser.close()
                return "Already connected. Skipping..."

            # 3. Ensure we are at the top of the page
            await page.evaluate("window.scrollTo(0, 0)")
            await asyncio.sleep(2)

            # 4. Close the messaging bar if it's open (it intercepts pointer events)
            try:
                # Try multiple ways to close it
                msg_close = await page.query_selector('button[aria-label="Close messaging overlay"]')
                if msg_close:
                    await msg_close.click()
                else:
                    msg_header = await page.query_selector('.msg-overlay-bubble-header')
                    if msg_header:
                        await msg_header.click()
                logger.info("Tried to close/toggle messaging bar.")
            except:
                pass

            # 5. Check for "Connect" or "More" (not connected)
            # Use specific ARIA labels which are very reliable on LinkedIn
            potential_connect_locators = [
                page.locator('[aria-label^="Invite"][aria-label$="to connect"]'),
                page.locator('button:has-text("Connect")'),
                page.locator('[aria-label*="connect"]'),
                page.locator('a:has-text("Connect")')
            ]
            
            connect_button = None
            for loc in potential_connect_locators:
                if await loc.count() > 0 and await loc.first.is_visible():
                    connect_button = loc.first
                    logger.info(f"Found Connect button with locator: {loc}")
                    break

            if connect_button:
                logger.info("Clicking the Connect button...")
                await connect_button.scroll_into_view_if_needed()
                await asyncio.sleep(1)
                await connect_button.click(force=True, timeout=5000)
                await asyncio.sleep(3) # Wait longer for popup
            else:
                # If not found, click "More"
                logger.info("Connect not found, looking for More button...")
                more_button = page.locator('main button:has-text("More")').first
                if await more_button.count() == 0:
                    more_button = page.locator('button:has-text("More")').first
                
                if await more_button.count() > 0:
                    await more_button.scroll_into_view_if_needed()
                    await more_button.click(force=True)
                    # Wait for dropdown to appear
                    await asyncio.sleep(2)
                    try:
                        # Now locate and click the "Connect" option inside the open dropdown
                        connect_option = page.locator('div.artdeco-dropdown__content--is-open [role="button"] :has-text("Connect")').first
                        if await connect_option.count() > 0:
                            await connect_option.click(force=True)
                            await asyncio.sleep(2) # Wait for popup
                        else:
                            raise Exception("Connect not found in More menu")
                    except:
                        await page.screenshot(path="neither_found.png")
                        logger.info("Neither Connect nor More button found on main profile, saved neither_found.png")
                        await browser.close()
                        return "Neither Connect nor More button found on main profile."
                else:
                    await page.screenshot(path="neither_found.png")
                    logger.info("Neither Connect nor More button found on main profile, saved neither_found.png")
                    await browser.close()
                    return "Neither Connect nor More button found on main profile."

            # Handle connection popup
            await asyncio.sleep(2) # Give popup time to appear
            
            if message:
                # Wait for the "Add a note" button to be visible
                add_note_button = page.locator('button[aria-label^="Add a note"], button:has-text("Add a note")').first
                if await add_note_button.count() > 0:
                    await add_note_button.click()
                    # Wait for the invitation textarea
                    await asyncio.sleep(1)
                    textarea = page.locator('textarea[name="message"], textarea').first
                    await textarea.wait_for(timeout=5000)
                    await textarea.fill(message)
                    # Use a flexible locator for the Send button
                    send_button = page.locator('button[aria-label^="Send invitation"], button:has-text("Send"), button[aria-label^="Send"]').first
                    await send_button.click()
                else:
                    logger.info("Add a note button not found. Sending without a note if possible.")
                    send_without_note = page.locator('button[aria-label^="Send without a note"], button:has-text("Send without a note"), button:has-text("Send"), button[aria-label^="Send"]').first
                    if await send_without_note.count() > 0:
                        await send_without_note.click()
            else:
                # Try Send without a note
                send_without_note = page.locator('button[aria-label^="Send without a note"], button:has-text("Send without a note"), button:has-text("Send"), button[aria-label^="Send"]').first
                if await send_without_note.count() > 0:
                    await send_without_note.click()

            # Wait for request to be processed
            await asyncio.sleep(4)
            
            # Check for "Done" button (sometimes appears after success)
            done_button = page.locator('button:has-text("Done"), button[aria-label^="Done"]').first
            if await done_button.count() > 0:
                await done_button.click()
                await asyncio.sleep(1)

            await page.screenshot(path="connect_success.png")
            logger.info("Connection process completed, screenshot saved to connect_success.png")

            await browser.close()
            
            return f"✅ Connection request process completed for {profile_url}"
                
            # --- END OF INTEGRATED SEND CONNECTION LOGIC ---

        except Exception as e:
            if 'page' in locals():
                await page.screenshot(path="connect_failure.png")
            if 'browser' in locals():
                try:
                    await browser.close()
                except:
                    pass
            logger.error(f"Error sending connection request, screenshot saved to connect_failure.png: {str(e)}")
            return f"Error: {str(e)}"
