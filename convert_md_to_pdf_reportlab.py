from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
import markdown2
import pathlib
import sys

def convert_md_to_pdf(input_md):
    md_path = pathlib.Path(input_md)
    if not md_path.exists():
        print(f"File {input_md} non trovato.")
        return

    txt = md_path.read_text(encoding='utf-8')
    # Pulizia minima per ReportLab Paragraph
    html = markdown2.markdown(txt)
    
    output_pdf = md_path.with_suffix('.pdf')
    doc = SimpleDocTemplate(str(output_pdf), pagesize=letter,
                            rightMargin=72, leftMargin=72,
                            topMargin=72, bottomMargin=72)

    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    font_path = r"C:\Windows\Fonts\arial.ttf"
    # Fix: TTFont non accetta encoding='UTF-8' nelle versioni recenti, lo gestisce internamente
    pdfmetrics.registerFont(TTFont('ArialUnicode', font_path))

    styles = getSampleStyleSheet()
    styles['Normal'].fontName = 'ArialUnicode'
    styles['Heading1'].fontName = 'ArialUnicode'
    
    story = []
    
    # Semplice parsing righe per ReportLab
    lines = html.splitlines()
    for line in lines:
        line = line.strip()
        if not line:
            story.append(Spacer(1, 12))
            continue
        # Rimuoviamo tag HTML semplici che markdown2 inserisce ma Paragraph non gestisce bene se non puliti
        clean_line = line.replace('<p>', '').replace('</p>', '').replace('<h1>', '<b>').replace('</h1>', '</b>').replace('<h3>', '<b>').replace('</h3>', '</b>')
        try:
            story.append(Paragraph(clean_line, styles['Normal']))
        except:
            continue

    doc.build(story)
    print(f'✅ PDF creato con successo: {output_pdf}')

if __name__ == "__main__":
    file_to_convert = sys.argv[1] if len(sys.argv) > 1 else "PROPOSTA_CUS_PROPATRIA.md"
    convert_md_to_pdf(file_to_convert)
