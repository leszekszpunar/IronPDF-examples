#!/usr/bin/env python3
"""
Skrypt do generowania plików testowych dla porównania serwisów PDF
"""

import os
from PIL import Image, ImageDraw, ImageFont
import io

def create_test_image(filename, text, size=(800, 600), bg_color=(255, 255, 255), text_color=(0, 0, 0)):
    """Tworzy przykładowy obraz z tekstem"""
    # Tworzenie obrazu
    image = Image.new('RGB', size, bg_color)
    draw = ImageDraw.Draw(image)
    
    # Dodanie tekstu
    try:
        # Próba użycia systemowej czcionki
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
    except:
        try:
            # Alternatywna czcionka
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
        except:
            # Domyślna czcionka
            font = ImageFont.load_default()
    
    # Wyśrodkowanie tekstu
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size[0] - text_width) // 2
    y = (size[1] - text_height) // 2
    
    draw.text((x, y), text, fill=text_color, font=font)
    
    # Dodanie ramki
    draw.rectangle([0, 0, size[0]-1, size[1]-1], outline=(100, 100, 100), width=3)
    
    # Zapisywanie
    image.save(filename)
    print(f"Utworzono obraz: {filename}")

def create_test_pdf_content():
    """Zwraca przykładową zawartość PDF"""
    return """%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 595 842]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 16 Tf
72 720 Td
(Test PDF Document) Tj
/F1 12 Tf
0 -30 Td
(This is a sample PDF file for testing purposes.) Tj
0 -20 Td
(It contains multiple lines of text to test) Tj
0 -20 Td
(PDF processing capabilities of different engines.) Tj
0 -20 Td
(Generated for performance comparison testing.) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000254 00000 n 
0000000320 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
580
%%EOF"""

def main():
    """Główna funkcja generująca pliki testowe"""
    print("Generowanie plików testowych...")
    
    # Tworzenie katalogu test-files
    test_dir = "test-files"
    if not os.path.exists(test_dir):
        os.makedirs(test_dir)
    
    # Generowanie obrazów
    create_test_image(
        f"{test_dir}/sample1.jpg", 
        "Sample Image 1\nTest Document", 
        (800, 600), 
        (240, 248, 255), 
        (25, 25, 112)
    )
    
    create_test_image(
        f"{test_dir}/sample2.png", 
        "Sample Image 2\nPerformance Test", 
        (1024, 768), 
        (255, 248, 220), 
        (139, 69, 19)
    )
    
    create_test_image(
        f"{test_dir}/sample3.jpg", 
        "Sample Image 3\nQuality Comparison", 
        (1200, 800), 
        (245, 245, 245), 
        (47, 84, 150)
    )
    
    # Generowanie plików PDF
    pdf_content = create_test_pdf_content()
    
    with open(f"{test_dir}/sample1.pdf", "w") as f:
        f.write(pdf_content)
    print(f"Utworzono PDF: {test_dir}/sample1.pdf")
    
    with open(f"{test_dir}/sample2.pdf", "w") as f:
        f.write(pdf_content.replace("Test PDF Document", "Test PDF Document 2"))
    print(f"Utworzono PDF: {test_dir}/sample2.pdf")
    
    with open(f"{test_dir}/sample3.pdf", "w") as f:
        f.write(pdf_content.replace("Test PDF Document", "Test PDF Document 3"))
    print(f"Utworzono PDF: {test_dir}/sample3.pdf")
    
    print("\n✅ Wszystkie pliki testowe zostały wygenerowane!")
    print(f"📁 Katalog: {test_dir}")
    print("📄 Pliki PDF: sample1.pdf, sample2.pdf, sample3.pdf")
    print("🖼️ Pliki obrazów: sample1.jpg, sample2.png, sample3.jpg")

if __name__ == "__main__":
    main() 