import pathlib
import PyPDF2

pdf_path = pathlib.Path(r"c:\progetti_stefano\automations\calendario_fitri_saas\COMUNICAZIONE.pdf")
reader = PyPDF2.PdfReader(str(pdf_path))
for page in reader.pages:
    print(page.extract_text())
