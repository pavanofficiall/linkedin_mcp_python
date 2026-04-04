# filepath: d:\CashRich\2025\LinkedIN\comments\comments_mcp\linkedin_mcp_python\PostLinkedin.py

import os
import logging
import asyncio
from playwright.async_api import async_playwright
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

STORAGE_STATE_PATH = "linkedin-state.json"

async def ensure_linkedin_login(page, linkedin_username, linkedin_password):
    """
    Ensure user is logged into LinkedIn
    """
    logger.info("Checking if already logged in...")
    await page.goto("https://www.linkedin.com/feed/")
    
    try:
        # Check if already logged in by looking for the search bar or feed
        await page.wait_for_selector("input[aria-label='Search']", timeout=8000)
        logger.info("Already logged in!")
        return True
    except Exception:
        logger.info("Not logged in, proceeding with login...")
    
    # Navigate to login page
    await page.goto("https://www.linkedin.com/login")
    await page.wait_for_selector("#username")
    
    # Fill login credentials
    logger.info("Filling login credentials...")
    await page.fill("#username", linkedin_username)
    await page.fill("#password", linkedin_password)
    
    # Click login button
    await page.click("button[type='submit']")
    
    try:
        # Wait for successful login (redirect to feed)
        await page.wait_for_url("**/feed/**", timeout=60000)
        logger.info("Login successful!")
        
        # Save session state
        context = page.context
        await context.storage_state(path=STORAGE_STATE_PATH)
        return True
    except Exception as e:
        await page.screenshot(path="login_failure.png")
        logger.error(f"Login failed, screenshot saved to login_failure.png: {str(e)}")
        return False

async def post_to_linkedin(content: str, username: str = None, password: str = None, add_hashtags: bool = True) -> str:
    """
    Write content to LinkedIn post composer using browser automation (does not actually publish).
    
    Args:
        content (str): The content to write in the LinkedIn post composer
        username (str): LinkedIn username/email (optional, falls back to env var)
        password (str): LinkedIn password (optional, falls back to env var)
        add_hashtags (bool): Whether to automatically add relevant hashtags
    
    Returns:
        str: Success or error message indicating content was written to composer
    """
    linkedin_username = username or os.getenv("LINKEDIN_USERNAME")
    linkedin_password = password or os.getenv("LINKEDIN_PASSWORD")
    
    if not linkedin_username or not linkedin_password:
        return "Missing LinkedIn credentials. Please provide username and password parameters or set LINKEDIN_USERNAME and LINKEDIN_PASSWORD environment variables."
    
    if not content or not content.strip():
        return "Error: Content is required and cannot be empty."
    
    # Validate content length (LinkedIn has a character limit)
    if len(content) > 3000:
        return f"Error: Content is too long ({len(content)} characters). LinkedIn posts have a 3000 character limit."
    
    logger.info(f"Starting LinkedIn post automation...")
    logger.info(f"Content length: {len(content)} characters")
    
    async with async_playwright() as p:
        try:
            logger.info("Launching browser...")
            
            # Load existing session if available
            context_args = {}
            if os.path.exists(STORAGE_STATE_PATH):
                context_args['storage_state'] = STORAGE_STATE_PATH
            
            browser = await p.chromium.launch(headless=True)  # Set to True for headless mode
            context = await browser.new_context(**context_args)
            page = await context.new_page()
            
            # Login to LinkedIn
            logged_in = await ensure_linkedin_login(page, linkedin_username, linkedin_password)
            if not logged_in:
                await browser.close()
                return "Login failed. Please check your credentials."
            
            # Navigate to LinkedIn feed
            logger.info("Navigating to LinkedIn feed...")
            #await page.goto("https://www.linkedin.com/feed/")
            #await asyncio.sleep(3)            # Find and click the "Start a post" button using Playwright's text capabilities
            logger.info("Looking for 'Start a post' button...")
            
            try:
                # Method 1: Use Playwright's text locator (most reliable)
                logger.info("Trying text-based locator...")
                start_post_button = page.locator('text="Start a post"').first
                
                # Wait for it to be visible
                await start_post_button.wait_for(timeout=10000)
                
                if await start_post_button.is_visible():
                    logger.info("Found 'Start a post' button using text locator")
                    await start_post_button.click()
                else:
                    raise Exception("Button not visible")
                    
            except Exception:
                try:
                    # Method 2: Use partial text match
                    logger.info("Trying partial text match...")
                    start_post_button = page.locator('button:has-text("Start a post")').first
                    await start_post_button.wait_for(timeout=5000)
                    
                    if await start_post_button.is_visible():
                        logger.info("Found 'Start a post' button using partial text match")
                        await start_post_button.click()
                    else:
                        raise Exception("Button not visible")
                        
                except Exception:
                    try:
                        # Method 3: Look for "Start a post" anywhere in the page and click the parent button
                        logger.info("Trying to find any element containing 'Start a post' text...")
                        start_post_text = page.locator('text=Start a post').first
                        await start_post_text.wait_for(timeout=5000)
                        
                        # Get the closest button ancestor
                        button_element = start_post_text.locator('xpath=ancestor-or-self::button').first
                        
                        if await button_element.is_visible():
                            logger.info("Found button containing 'Start a post' text")
                            await button_element.click()
                        else:
                            raise Exception("No clickable button found")
                            
                    except Exception:
                        await browser.close()
                        return "Error: Could not find the 'Start a post' button on the page. Please make sure you're on the LinkedIn feed page."
            
            logger.info("Successfully clicked 'Start a post' button!")
            #await asyncio.sleep(3)
              # Find the text area using Playwright's text-based capabilities
            logger.info("Looking for post composition text area...")
            
            try:
                # Method 1: Look for placeholder text "What do you want to talk about?"
                logger.info("Trying to find text area by placeholder text...")
                text_area = page.locator('[placeholder*="What do you want to talk about"]').first
                await text_area.wait_for(timeout=10000)
                
                if await text_area.is_visible():
                    logger.info("Found text area using placeholder text")
                else:
                    raise Exception("Text area not visible")
                    
            except Exception:
                try:
                    # Method 2: Look for any contenteditable div that might be the text area
                    logger.info("Trying to find contenteditable text area...")
                    text_area = page.locator('div[contenteditable="true"]').first
                    await text_area.wait_for(timeout=5000)
                    
                    if await text_area.is_visible():
                        logger.info("Found contenteditable text area")
                    else:
                        raise Exception("Text area not visible")
                        
                except Exception:
                    try:
                        # Method 3: Look for text that says "What do you want to talk about" and find nearby input
                        logger.info("Looking for 'What do you want to talk about' text...")
                        placeholder_text = page.locator('text=What do you want to talk about').first
                        await placeholder_text.wait_for(timeout=5000)
                          # Find the parent container and look for editable element
                        parent_container = placeholder_text.locator('xpath=ancestor::div[1]').first
                        text_area = parent_container.locator('[contenteditable]').first
                        
                        if await text_area.is_visible():
                            logger.info("Found text area near placeholder text")
                        else:
                            raise Exception("No editable area found")
                            
                    except Exception:
                        await browser.close()
                        return "Error: Could not find the post composition text area. The LinkedIn interface may have changed."
              
            # No hashtags will be added; just use the content as is
            final_content = content
            
            # Fill the text area with content
            logger.info("Filling post content...")
            await text_area.click()  # Focus on the text area
            await asyncio.sleep(1)
              # Clear any existing content and paste new content all at once
            await page.keyboard.press('Control+a')  # Select all existing content
            await asyncio.sleep(0.5)
            
            # Write content all at once using fill method (fastest)
            logger.info("Writing content to the text area...")
            await text_area.fill(final_content)
            await asyncio.sleep(1)
            
            # Verify content was typed
            try:
                typed_content = await text_area.inner_text()
                if typed_content.strip():
                    logger.info(f"Content successfully typed! Length: {len(typed_content)} characters")
                else:
                    logger.warning("Text area appears empty after typing. Trying alternative method...")
                    # Alternative method: use fill instead of type
                    await text_area.fill(final_content)
                    await asyncio.sleep(1)
                    logger.info("Used fill method as fallback")
            except Exception as e:
                logger.warning(f"Could not verify typed content: {e}")
                # Try alternative typing method
                await page.keyboard.type(final_content)
                logger.info("Used keyboard.type as fallback method")
            
            logger.info("Content filled successfully!")
            logger.info("Content has been written to the LinkedIn post composer. You can now manually review and post it.")
            
            # Keep the browser open for manual review (optional - remove this sleep if you want it to close immediately)
            logger.info("Browser will remain open for 30 seconds for manual review...")
            await asyncio.sleep(30)
            
            await browser.close()
            
            return f"✅ Successfully wrote content to LinkedIn post composer!\n\nContent preview:\n{final_content[:200]}{'...' if len(final_content) > 200 else ''}\n\n📝 The content has been filled in the post composer. You can manually review and publish it."
            
        except Exception as e:
            if 'browser' in locals():
                try:
                    await browser.close()
                except:
                    pass
            logger.error(f"Error posting to LinkedIn: {str(e)}")
            return f"Error: {str(e)}"

async def demo_linkedin_post():
    """
    Demo function to test LinkedIn post composer with sample content
    """
    sample_content = """🚀 The Future of AI in Business: 3 Game-Changing Insights

After analyzing hundreds of successful AI implementations, here are the patterns that separate winners from followers:

1️⃣ **Start Small, Think Big**
Companies that succeed don't try to revolutionize everything at once. They pick ONE process, master it, then scale. Netflix didn't start with personalized recommendations for every user—they began with simple rating predictions.

2️⃣ **Data Quality > Data Quantity**
I've seen startups with 10,000 clean, labeled data points outperform enterprises with millions of messy records. Clean data is like premium fuel—your AI engine runs smoother and faster.

3️⃣ **Human-AI Partnership, Not Replacement**
The most successful implementations amplify human capabilities rather than replace them. Think of AI as your smartest intern—eager, fast, but still needs guidance.

💡 **The Contrarian Truth**: The companies winning with AI aren't the ones with the biggest budgets or fanciest models. They're the ones that understand their business problems deeply and apply AI strategically.

What's your experience with AI implementation? Have you seen this pattern in your industry?

#ArtificialIntelligence #BusinessStrategy #Innovation #DigitalTransformation #Leadership #TechTrends"""

    result = await post_to_linkedin(sample_content)
    print(result)

# Example usage
if __name__ == "__main__":
    # You can run this to test the posting functionality
    # asyncio.run(demo_linkedin_post())
    
    # Or post custom content
    custom_content = """🎯 Just discovered something fascinating about productivity...

Most people think productivity is about doing MORE tasks faster.

But after tracking my habits for 6 months, I learned the opposite is true.

The most productive people I know do FEWER things, but with laser focus.

Here's what changed everything for me:

✅ Instead of 20 small tasks → 3 important ones
✅ Instead of multitasking → Deep work blocks
✅ Instead of being busy → Being effective

The result? 40% more meaningful work completed with 30% less stress.

What's your biggest productivity breakthrough? 👇"""
    
    print("LinkedIn Content Writer Tool Ready!")
    print("To use:")
    print("1. Set LINKEDIN_USERNAME and LINKEDIN_PASSWORD in .env file")
    print("2. Call: asyncio.run(post_to_linkedin('your content here'))")
    print("3. Or run the demo: asyncio.run(demo_linkedin_post())")
    print("\nNote: This tool writes content to the LinkedIn composer but does not publish it.")
    print("You can manually review and publish the content after it's filled in.")
    asyncio.run(post_to_linkedin(custom_content))