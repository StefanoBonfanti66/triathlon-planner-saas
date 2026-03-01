import time
from playwright.sync_api import sync_playwright

def run_debug_links():
    print("--- 🕵️ DEBUGGING LINKS ---")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto("https://www.myfitri.it/calendario", wait_until="networkidle")
        time.sleep(5)

        # Unlock
        page.evaluate("""() => {
            const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
            document.querySelectorAll('.v-chip__close, .v-icon--link, button[aria-label*="close"]').forEach(el => el.click());
        }""")
        time.sleep(5)

        # Look at the first card
        cards = page.locator(".v-card").all()
        if cards:
            first_card = cards[0]
            print("--- FIRST CARD INNER HTML ---")
            # We use evaluate to get the HTML to see where the links are
            html = first_card.evaluate("el => el.innerHTML")
            print(html[:2000]) # Print first 2000 chars
            
            links = first_card.locator("a").all()
            print(f"Found {len(links)} links in first card.")
            for i, link in enumerate(links):
                href = link.get_attribute("href")
                text = link.inner_text()
                print(f"Link {i}: Text='{text}', Href='{href}'")
        else:
            print("No cards found.")

        input("Press Enter to close...")
        browser.close()

if __name__ == "__main__":
    run_debug_links()
