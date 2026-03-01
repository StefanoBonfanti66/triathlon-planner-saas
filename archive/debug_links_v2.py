import time
import re
from playwright.sync_api import sync_playwright

NL = chr(10)

def run_debug_links():
    print("--- 🕵️ DEBUGGING LINKS (MONTH UNLOCK INCLUDED) ---")
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=False)
            page = browser.new_page()
            
            print("🔗 Caricamento MyFITri...")
            page.goto("https://www.myfitri.it/calendario", wait_until="networkidle")
            time.sleep(5)

            print("🔍 Rimozione filtri mese...")
            months_regex = re.compile(r"Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre", re.IGNORECASE)
            month_filters = page.locator("span").filter(has_text=months_regex)
            if month_filters.count() > 0:
                for i in range(month_filters.count()):
                    try:
                        month_filters.nth(i).locator("i").click(timeout=5000)
                        print("✅ Filtro rimosso.")
                    except: pass
            
            print("💡 Se vedi ancora il filtro mese, cliccalo a mano ora!")
            time.sleep(5)

            print("📊 Analisi link nella prima gara trovata...")
            # Cerchiamo tutte le card caricate
            cards = page.locator(".v-card").all()
            if len(cards) > 0:
                card = cards[0]
                # Stampiamo tutti i link (<a>) dentro la card
                links = card.locator("a").all()
                print("--- TROVATI " + str(len(links)) + " LINK NELLA CARD ---")
                for i, link in enumerate(links):
                    href = link.get_attribute("href")
                    text = link.inner_text().strip()
                    print("Link " + str(i) + ": [" + text + "] -> " + str(href))
            else:
                print("❌ Nessuna card trovata.")

            print(NL + "Premi INVIO per chiudere...")
            input()
            browser.close()
        except Exception as e:
            print("Errore: " + str(e))

if __name__ == "__main__":
    run_debug_links()
