#!/usr/bin/env python3
"""Convert a Markdown file to PDF using markdown + xhtml2pdf.

Usage:
    python tools/markdown_to_pdf.py [input.md] [output.pdf]
"""
import sys
import os
from markdown import markdown
from xhtml2pdf import pisa


def md_to_pdf(md_path, pdf_path):
    with open(md_path, "r", encoding="utf-8") as f:
        md = f.read()
    html_body = markdown(md, extensions=["fenced_code", "tables"]) 
    html = f"""<html><head><meta charset=\"utf-8\">\n<style>
    @page {{
        margin: 1.5cm;
        size: A4;
    }}
    body {{ 
        font-family: Helvetica, Arial, sans-serif; 
        font-size: 10pt;
        line-height: 1.2;
        color: #1e293b;
    }}
    h1 {{ 
        font-size: 22pt; 
        margin-bottom: 12pt; 
        color: #dc2626; 
        text-align: center; 
        border-bottom: 2pt solid #dc2626; 
        padding-bottom: 6pt;
        text-transform: uppercase;
    }}
    h2 {{ 
        font-size: 14pt; 
        margin-top: 14pt; 
        margin-bottom: 6pt; 
        color: #0f172a; 
        border-left: 4pt solid #dc2626; 
        padding-left: 8pt;
        background-color: #f8fafc;
    }}
    h3 {{ 
        font-size: 11pt; 
        margin-top: 10pt; 
        margin-bottom: 4pt; 
        color: #334155;
    }}
    p {{ margin-bottom: 4pt; text-align: justify; }}
    ul, ol {{ margin-left: 15pt; margin-bottom: 6pt; padding: 0; }}
    li {{ margin-bottom: 1pt; padding: 0; }}
    li p {{ margin-bottom: 0; padding: 0; }}
    strong {{ color: #0f172a; }}
    hr {{ border: 0; border-top: 1pt solid #e2e8f0; margin: 15pt 0; }}
    pre {{ 
        background: #f1f5f9; 
        padding: 8pt; 
        border-radius: 4pt;
        font-size: 9pt;
        margin-bottom: 8pt;
    }}
    table {{ border-collapse: collapse; width: 100%; margin-bottom: 10pt; }}
    th, td {{ border: 0.5pt solid #cbd5e1; padding: 4pt; font-size: 9pt; }}
    th {{ background-color: #f8fafc; font-weight: bold; text-align: left; }}
</style></head><body>\n""" + html_body + "\n</body></html>"

    with open(pdf_path, "wb") as result_file:
        pisa_status = pisa.CreatePDF(html, dest=result_file)
    return pisa_status.err == 0


if __name__ == "__main__":
    md = "GUIDA_UTENTE.md"
    pdf = "GUIDA_UTENTE.pdf"
    if len(sys.argv) > 1:
        md = sys.argv[1]
    if len(sys.argv) > 2:
        pdf = sys.argv[2]
    ok = md_to_pdf(md, pdf)
    if not ok:
        print("Errore nella creazione del PDF.")
        sys.exit(1)
    print("PDF creato:", pdf)
