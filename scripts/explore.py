from pathlib import Path
import pdfplumber

PDF_PATH = Path(__file__).resolve().parent.parent/"pdfs"/"WA_Sum_201106386R_ESI5P_Jul2025.pdf"

with pdfplumber.open(PDF_PATH) as pdf:
  print(len(pdf.pages))
  first_page = pdf.pages[0]
  for i in range(len(pdf.pages)):
    print(pdf.pages[i].page_number)
    print(pdf.pages[i].extract_text())
  