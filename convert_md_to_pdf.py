import markdown2, weasyprint
import pathlib

md_file = pathlib.Path(r"c:\progetti_stefano\automations\calendario_fitri_saas\COMUNICAZIONE.md")
html = markdown2.markdown(md_file.read_text(), extras=["fenced-code-blocks"])
# add some basic styling
html = f"<html><head><meta charset='utf-8'><style>body {{ font-family: Arial, sans-serif; margin: 2em; }} h1 {{ text-align: center; }} hr {{ margin-top: 2em; margin-bottom: 2em; }}</style></head><body>{html}</body></html>"
pdf_file = pathlib.Path(r"c:\progetti_stefano\automations\calendario_fitri_saas\COMUNICAZIONE.pdf")
weasyprint.HTML(string=html).write_pdf(pdf_file)
print('PDF created at', pdf_file)
