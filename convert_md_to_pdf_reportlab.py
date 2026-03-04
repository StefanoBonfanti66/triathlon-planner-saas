from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
import markdown2
import pathlib

md_file = pathlib.Path(r"c:\progetti_stefano\automations\calendario_fitri_saas\COMUNICAZIONE.md")
txt = md_file.read_text()
html = markdown2.markdown(txt, extras=["fenced-code-blocks", "tables"])

pdf_file = pathlib.Path(r"c:\progetti_stefano\automations\calendario_fitri_saas\COMUNICAZIONE.pdf")
doc = SimpleDocTemplate(str(pdf_file), pagesize=letter,
                        rightMargin=72,leftMargin=72,
                        topMargin=72,bottomMargin=18)

# register a TrueType font supporting accents (use Arial from Windows fonts)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

font_path = r"C:\Windows\Fonts\arial.ttf"
# specify UTF-8 encoding so ReportLab uses Identity-H and embeds proper unicode mapping
pdfmetrics.registerFont(TTFont('ArialUnicode', font_path, encoding='UTF-8'))

styles = getSampleStyleSheet()
# ensure styles exist before adding, specify the unicode font
if 'Heading1' not in styles:
    styles.add(ParagraphStyle(name='Heading1', fontName='ArialUnicode', fontSize=18, leading=22, spaceAfter=12))
if 'Heading2' not in styles:
    styles.add(ParagraphStyle(name='Heading2', fontName='ArialUnicode', fontSize=14, leading=18, spaceAfter=10))
if 'Normal' in styles:
    styles['Normal'].fontName = 'ArialUnicode'
else:
    styles.add(ParagraphStyle(name='Normal', fontName='ArialUnicode', fontSize=12, leading=14))


story = []

# naive split by lines and convert to paragraphs
for line in html.splitlines():
    line = line.strip()
    if not line:
        story.append(Spacer(1,12))
        continue
    story.append(Paragraph(line, styles['Normal']))


doc.build(story)
print('PDF created at', pdf_file)
