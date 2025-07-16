#!/usr/bin/env python3
"""
Skrypt do generowania plików testowych z kodami kreskowymi i QR
"""

import os
import qrcode
from PIL import Image, ImageDraw, ImageFont
import barcode
from barcode.writer import ImageWriter
import fitz  # PyMuPDF
import tempfile

def create_test_directory():
    """Tworzy katalog test-files jeśli nie istnieje"""
    if not os.path.exists('test-files'):
        os.makedirs('test-files')
        print("✅ Utworzono katalog test-files")

def generate_qr_code(text, filename, size=300):
    """Generuje kod QR"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(text)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img = img.resize((size, size))
    
    # Dodaj tekst pod kodem QR
    new_img = Image.new('RGB', (size, size + 50), 'white')
    new_img.paste(img, (0, 0))
    
    draw = ImageDraw.Draw(new_img)
    try:
        font = ImageFont.truetype("arial.ttf", 16)
    except:
        font = ImageFont.load_default()
    
    draw.text((10, size + 10), f"QR: {text[:30]}...", fill="black", font=font)
    
    new_img.save(f'test-files/{filename}')
    print(f"✅ Wygenerowano kod QR: {filename}")

def generate_barcode(text, filename, barcode_type='code128'):
    """Generuje kod kreskowy"""
    # Generuj kod kreskowy
    bc = barcode.get(barcode_type, text, writer=ImageWriter())
    
    # Zapisz jako obraz
    img = bc.render()
    
    # Dodaj tekst pod kodem
    width, height = img.size
    new_img = Image.new('RGB', (width, height + 50), 'white')
    new_img.paste(img, (0, 0))
    
    draw = ImageDraw.Draw(new_img)
    try:
        font = ImageFont.truetype("arial.ttf", 16)
    except:
        font = ImageFont.load_default()
    
    draw.text((10, height + 10), f"Barcode: {text}", fill="black", font=font)
    
    new_img.save(f'test-files/{filename}')
    print(f"✅ Wygenerowano kod kreskowy: {filename}")

def generate_mixed_codes_image():
    """Generuje obraz z mieszanymi kodami"""
    # Utwórz nowy obraz
    img = Image.new('RGB', (800, 600), 'white')
    draw = ImageDraw.Draw(img)
    
    # Dodaj kod QR
    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data("https://example.com/test")
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_img = qr_img.resize((150, 150))
    img.paste(qr_img, (50, 50))
    
    # Dodaj kod kreskowy
    bc = barcode.get('code128', '123456789', writer=ImageWriter())
    bc_img = bc.render()
    bc_img = bc_img.resize((300, 100))
    img.paste(bc_img, (50, 250))
    
    # Dodaj tekst
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except:
        font = ImageFont.load_default()
    
    draw.text((50, 20), "Mixed Codes Test", fill="black", font=font)
    draw.text((50, 220), "QR Code", fill="black", font=font)
    draw.text((50, 370), "Barcode", fill="black", font=font)
    
    img.save('test-files/mixed_codes.png')
    print("✅ Wygenerowano obraz z mieszanymi kodami: mixed_codes.png")

def generate_pdf_with_codes():
    """Generuje PDF z kodami"""
    # Utwórz nowy dokument PDF
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4
    
    # Dodaj kod QR
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data("PDF Test QR Code")
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Zapisz QR tymczasowo
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
        qr_img.save(tmp.name)
        # Wstaw do PDF
        page.insert_image(fitz.Rect(50, 50, 200, 200), filename=tmp.name)
        os.unlink(tmp.name)
    
    # Dodaj kod kreskowy
    bc = barcode.get('code128', 'PDF123456', writer=ImageWriter())
    bc_img = bc.render()
    
    # Zapisz barcode tymczasowo
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
        bc_img.save(tmp.name)
        # Wstaw do PDF
        page.insert_image(fitz.Rect(50, 250, 350, 350), filename=tmp.name)
        os.unlink(tmp.name)
    
    # Dodaj tekst
    page.insert_text((50, 30), "PDF with Codes Test", fontsize=20)
    page.insert_text((50, 220), "QR Code", fontsize=14)
    page.insert_text((50, 370), "Barcode", fontsize=14)
    
    doc.save('test-files/test_with_codes.pdf')
    doc.close()
    print("✅ Wygenerowano PDF z kodami: test_with_codes.pdf")

def main():
    """Główna funkcja"""
    print("🚀 Generowanie plików testowych z kodami...")
    
    create_test_directory()
    
    # Generuj kody QR
    generate_qr_code("https://example.com/test", "qr_test.png")
    generate_qr_code("Test QR Code 123", "qr_simple.png")
    generate_qr_code("https://github.com/example/repo", "qr_github.png")
    
    # Generuj kody kreskowe
    generate_barcode("123456789", "barcode_test.png", "code128")
    generate_barcode("987654321", "barcode_code39.png", "code39")
    generate_barcode("1234567890123", "barcode_ean13.png", "ean13")
    
    # Generuj obraz z mieszanymi kodami
    generate_mixed_codes_image()
    
    # Generuj PDF z kodami
    generate_pdf_with_codes()
    
    print("\n🎉 Wszystkie pliki testowe zostały wygenerowane!")
    print("\n📁 Pliki w katalogu test-files:")
    for file in os.listdir('test-files'):
        if file.endswith(('.png', '.pdf')):
            print(f"  - {file}")

if __name__ == "__main__":
    main() 