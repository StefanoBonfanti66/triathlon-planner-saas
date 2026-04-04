import markdown2
import pathlib
from playwright.sync_api import sync_playwright

md_file = pathlib.Path(r"c:\progetti_stefano\automations\calendario_fitri_saas\COMUNICAZIONE.md")
html = markdown2.markdown(md_file.read_text(), extras=["fenced-code-blocks"])
# simple HTML wrapper with basic style
doc_html = f"""<!doctype html>
<html><head><meta charset='utf-8'><style>
body {{ font-family: Arial, sans-serif; margin: 2em; }}
h1 {{ text-align: center; }}
</style></head><body>{html}</body></html>"""

output_pdf = pathlib.Path(r"c:\progetti_stefano\automations\calendario_fitri_saas\COMUNICAZIONE.pdf")

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page()
    page.set_content(doc_html)
    page.pdf(path=str(output_pdf), format='A4')
    browser.close()

print('PDF created with Playwright at', output_pdf)
