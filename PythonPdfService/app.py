from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from flask_swagger_ui import get_swaggerui_blueprint
import os
import tempfile
import shutil
from datetime import datetime
import PyPDF2
from PIL import Image
import img2pdf
import io
import fitz  # PyMuPDF
import cv2
import numpy as np
from pyzbar import pyzbar
import qrcode
from qreader import QReader
import easyocr

app = Flask(__name__)
CORS(app)

# Konfiguracja Swagger
SWAGGER_URL = '/swagger'
API_URL = '/static/swagger.json'
swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,
    API_URL,
    config={
        'app_name': "PythonPdfService API"
    }
)
app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)

# Konfiguracja
UPLOAD_FOLDER = '/tmp'
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff', '.tif'}
ALLOWED_PDF_EXTENSIONS = {'.pdf'}
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

def allowed_image_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in [ext[1:] for ext in ALLOWED_IMAGE_EXTENSIONS]

def allowed_pdf_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in [ext[1:] for ext in ALLOWED_PDF_EXTENSIONS]

def get_page_size(output_format):
    """Zwraca rozmiar strony w punktach (1 punkt = 1/72 cala)"""
    sizes = {
        'A4': (595, 842),
        'A3': (842, 1191),
        'A5': (420, 595),
        'LETTER': (612, 792)
    }
    return sizes.get(output_format.upper(), sizes['A4'])

@app.route('/api/pdf/merge-pdfs', methods=['POST'])
def merge_pdfs():
    """Łączy kilka plików PDF w jeden dokument"""
    try:
        if 'files' not in request.files:
            return jsonify({'message': 'Nie przekazano żadnych plików'}), 400
        
        files = request.files.getlist('files')
        if not files or all(file.filename == '' for file in files):
            return jsonify({'message': 'Nie przekazano żadnych plików'}), 400
        
        output_format = request.args.get('outputFormat', 'A4')
        temp_files = []
        pdf_files = []
        
        try:
            # Zapisz pliki tymczasowo i sprawdź formaty
            for file in files:
                if file and file.filename:
                    if not allowed_pdf_file(file.filename):
                        continue
                    
                    temp_path = tempfile.mktemp(suffix='.pdf')
                    file.save(temp_path)
                    temp_files.append(temp_path)
                    pdf_files.append(temp_path)
            
            if not pdf_files:
                return jsonify({'message': 'Nie znaleziono prawidłowych plików PDF'}), 400
            
            # Połącz PDF-y
            merger = PyPDF2.PdfMerger()
            for pdf_file in pdf_files:
                merger.append(pdf_file)
            
            # Zapisz wynik
            output_filename = f"merged_pdfs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
            
            with open(output_path, 'wb') as output_file:
                merger.write(output_file)
            
            merger.close()
            
            # Zwróć plik
            return send_file(
                output_path,
                as_attachment=True,
                download_name=output_filename,
                mimetype='application/pdf'
            )
            
        finally:
            # Wyczyść pliki tymczasowe
            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            if os.path.exists(output_path):
                os.remove(output_path)
                
    except Exception as e:
        return jsonify({'message': f'Błąd podczas łączenia plików PDF: {str(e)}'}), 500

@app.route('/api/pdf/images-to-pdf', methods=['POST'])
def images_to_pdf():
    """Konwertuje obrazy do formatu PDF"""
    try:
        if 'files' not in request.files:
            return jsonify({'message': 'Nie przekazano żadnych plików'}), 400
        
        files = request.files.getlist('files')
        if not files or all(file.filename == '' for file in files):
            return jsonify({'message': 'Nie przekazano żadnych plików'}), 400
        
        output_format = request.args.get('outputFormat', 'A4')
        temp_files = []
        image_files = []
        
        try:
            # Zapisz pliki tymczasowo i sprawdź formaty
            for file in files:
                if file and file.filename:
                    if not allowed_image_file(file.filename):
                        continue
                    
                    temp_path = tempfile.mktemp(suffix=os.path.splitext(file.filename)[1])
                    file.save(temp_path)
                    temp_files.append(temp_path)
                    image_files.append(temp_path)
            
            if not image_files:
                return jsonify({'message': 'Nie znaleziono prawidłowych plików obrazów'}), 400
            
            # Konwertuj obrazy do PDF
            output_filename = f"images_to_pdf_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
            
            # Użyj img2pdf do konwersji
            with open(output_path, "wb") as f:
                f.write(img2pdf.convert(image_files))
            
            # Zwróć plik
            return send_file(
                output_path,
                as_attachment=True,
                download_name=output_filename,
                mimetype='application/pdf'
            )
            
        finally:
            # Wyczyść pliki tymczasowe
            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            if os.path.exists(output_path):
                os.remove(output_path)
                
    except Exception as e:
        return jsonify({'message': f'Błąd podczas konwersji obrazów do PDF: {str(e)}'}), 500

@app.route('/api/pdf/merge-all', methods=['POST'])
def merge_pdfs_and_images():
    """Łączy pliki PDF i obrazy w jeden dokument"""
    try:
        if 'files' not in request.files:
            return jsonify({'message': 'Nie przekazano żadnych plików'}), 400
        
        files = request.files.getlist('files')
        if not files or all(file.filename == '' for file in files):
            return jsonify({'message': 'Nie przekazano żadnych plików'}), 400
        
        output_format = request.args.get('outputFormat', 'A4')
        temp_files = []
        pdf_files = []
        image_files = []
        
        try:
            # Zapisz pliki tymczasowo i sprawdź formaty
            for file in files:
                if file and file.filename:
                    temp_path = tempfile.mktemp(suffix=os.path.splitext(file.filename)[1])
                    file.save(temp_path)
                    temp_files.append(temp_path)
                    
                    if allowed_pdf_file(file.filename):
                        pdf_files.append(temp_path)
                    elif allowed_image_file(file.filename):
                        image_files.append(temp_path)
            
            if not pdf_files and not image_files:
                return jsonify({'message': 'Nie znaleziono prawidłowych plików PDF ani obrazów'}), 400
            
            # Połącz wszystkie pliki
            merger = PyPDF2.PdfMerger()
            
            # Dodaj PDF-y
            for pdf_file in pdf_files:
                merger.append(pdf_file)
            
            # Konwertuj obrazy do PDF i dodaj
            if image_files:
                images_pdf_path = tempfile.mktemp(suffix='.pdf')
                with open(images_pdf_path, "wb") as f:
                    f.write(img2pdf.convert(image_files))
                
                merger.append(images_pdf_path)
                temp_files.append(images_pdf_path)
            
            # Zapisz wynik
            output_filename = f"merged_pdfs_and_images_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
            
            with open(output_path, 'wb') as output_file:
                merger.write(output_file)
            
            merger.close()
            
            # Zwróć plik
            return send_file(
                output_path,
                as_attachment=True,
                download_name=output_filename,
                mimetype='application/pdf'
            )
            
        finally:
            # Wyczyść pliki tymczasowe
            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            if os.path.exists(output_path):
                os.remove(output_path)
                
    except Exception as e:
        return jsonify({'message': f'Błąd podczas łączenia plików PDF i obrazów: {str(e)}'}), 500

@app.route('/api/pdf/extract-text', methods=['POST'])
def extract_text():
    """Ekstrahuje tekst z pliku PDF"""
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'Nie przekazano pliku'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'message': 'Nie przekazano pliku'}), 400
        
        if not allowed_pdf_file(file.filename):
            return jsonify({'message': 'Przekazany plik nie jest plikiem PDF'}), 400
        
        temp_path = None
        try:
            # Zapisz plik tymczasowo
            temp_path = tempfile.mktemp(suffix='.pdf')
            file.save(temp_path)
            
            # Ekstrahuj tekst używając PyMuPDF
            doc = fitz.open(temp_path)
            extracted_text = ""
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                extracted_text += f"Strona {page_num + 1}:\n{page.get_text()}\n\n"
            
            doc.close()
            
            # Zwróć tekst jako plik
            output_filename = f"{os.path.splitext(file.filename)[0]}_extracted_text.txt"
            
            return send_file(
                io.BytesIO(extracted_text.encode('utf-8')),
                as_attachment=True,
                download_name=output_filename,
                mimetype='text/plain'
            )
            
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        return jsonify({'message': f'Błąd podczas ekstrakcji tekstu z PDF: {str(e)}'}), 500

@app.route('/api/pdf/supported-formats', methods=['GET'])
def supported_formats():
    """Zwraca informacje o obsługiwanych formatach plików"""
    return jsonify({
        'service': 'Python (Flask + PyMuPDF + img2pdf)',
        'description': 'Implementacja Python z bibliotekami PyMuPDF, img2pdf i PyPDF2',
        'supportedImageFormats': list(ALLOWED_IMAGE_EXTENSIONS),
        'supportedPdfFormats': list(ALLOWED_PDF_EXTENSIONS),
        'supportedOutputFormats': ['A4', 'A3', 'A5', 'LETTER'],
        'features': [
            'Pełna ekstrakcja tekstu z PDF',
            'Wysokiej jakości konwersja obrazów',
            'Łączenie PDF i obrazów',
            'Obsługa wielu formatów obrazów'
        ]
    })

@app.route('/api/pdf/read-barcodes', methods=['POST'])
def read_barcodes():
    """Odczytywanie kodów kreskowych z obrazu/PDF"""
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'Nie przekazano pliku'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'message': 'Nie wybrano pliku'}), 400
        
        # Zapisz plik tymczasowo
        temp_path = tempfile.mktemp(suffix=os.path.splitext(file.filename)[1])
        file.save(temp_path)
        
        barcodes = []
        
        try:
            if file.filename.lower().endswith('.pdf'):
                # Dla PDF - wyodrębnij strony jako obrazy
                doc = fitz.open(temp_path)
                for page_num in range(min(3, len(doc))):  # Pierwsze 3 strony
                    page = doc.load_page(page_num)
                    pix = page.get_pixmap()
                    img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                        pix.height, pix.width, pix.n
                    )
                    
                    # Konwertuj do formatu OpenCV
                    if pix.n == 4:  # RGBA
                        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)
                    else:  # RGB
                        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                    
                    # Odczytywanie kodów kreskowych
                    detected_barcodes = pyzbar.decode(img_array)
                    for barcode in detected_barcodes:
                        barcodes.append({
                            'type': 'barcode',
                            'data': barcode.data.decode('utf-8'),
                            'format': barcode.type,
                            'confidence': 1.0,
                            'page': page_num + 1,
                            'bounds': {
                                'x': barcode.rect.left,
                                'y': barcode.rect.top,
                                'width': barcode.rect.width,
                                'height': barcode.rect.height
                            }
                        })
                
                doc.close()
            else:
                # Dla obrazów - bezpośrednie odczytywanie
                img_array = cv2.imread(temp_path)
                detected_barcodes = pyzbar.decode(img_array)
                
                for barcode in detected_barcodes:
                    barcodes.append({
                        'type': 'barcode',
                        'data': barcode.data.decode('utf-8'),
                        'format': barcode.type,
                        'confidence': 1.0,
                        'bounds': {
                            'x': barcode.rect.left,
                            'y': barcode.rect.top,
                            'width': barcode.rect.width,
                            'height': barcode.rect.height
                        }
                    })
        
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
        return jsonify({
            'success': True,
            'barcodes': barcodes,
            'count': len(barcodes),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'message': f'Błąd podczas odczytywania kodów kreskowych: {str(e)}'}), 500

@app.route('/api/pdf/read-qr-codes', methods=['POST'])
def read_qr_codes():
    """Odczytywanie kodów QR z obrazu/PDF"""
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'Nie przekazano pliku'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'message': 'Nie wybrano pliku'}), 400
        
        # Zapisz plik tymczasowo
        temp_path = tempfile.mktemp(suffix=os.path.splitext(file.filename)[1])
        file.save(temp_path)
        
        qr_codes = []
        
        try:
            if file.filename.lower().endswith('.pdf'):
                # Dla PDF - wyodrębnij strony jako obrazy
                doc = fitz.open(temp_path)
                qreader = QReader()
                
                for page_num in range(min(3, len(doc))):  # Pierwsze 3 strony
                    page = doc.load_page(page_num)
                    pix = page.get_pixmap()
                    img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                        pix.height, pix.width, pix.n
                    )
                    
                    # Konwertuj do formatu OpenCV
                    if pix.n == 4:  # RGBA
                        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)
                    else:  # RGB
                        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                    
                    # Odczytywanie kodów QR
                    decoded_text = qreader.detect_and_decode(image=img_array)
                    if decoded_text:
                        qr_codes.append({
                            'type': 'qr',
                            'data': decoded_text,
                            'format': 'QR_CODE',
                            'confidence': 1.0,
                            'page': page_num + 1
                        })
                
                doc.close()
            else:
                # Dla obrazów - bezpośrednie odczytywanie
                img_array = cv2.imread(temp_path)
                qreader = QReader()
                decoded_text = qreader.detect_and_decode(image=img_array)
                
                if decoded_text:
                    qr_codes.append({
                        'type': 'qr',
                        'data': decoded_text,
                        'format': 'QR_CODE',
                        'confidence': 1.0
                    })
        
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
        return jsonify({
            'success': True,
            'qrCodes': qr_codes,
            'count': len(qr_codes),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'message': f'Błąd podczas odczytywania kodów QR: {str(e)}'}), 500

@app.route('/api/pdf/read-all-codes', methods=['POST'])
def read_all_codes():
    """Odczytywanie wszystkich kodów (kreskowych i QR) z obrazu/PDF"""
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'Nie przekazano pliku'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'message': 'Nie wybrano pliku'}), 400
        
        # Zapisz plik tymczasowo
        temp_path = tempfile.mktemp(suffix=os.path.splitext(file.filename)[1])
        file.save(temp_path)
        
        all_codes = []
        
        try:
            if file.filename.lower().endswith('.pdf'):
                # Dla PDF - wyodrębnij strony jako obrazy
                doc = fitz.open(temp_path)
                qreader = QReader()
                
                for page_num in range(min(3, len(doc))):  # Pierwsze 3 strony
                    page = doc.load_page(page_num)
                    pix = page.get_pixmap()
                    img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                        pix.height, pix.width, pix.n
                    )
                    
                    # Konwertuj do formatu OpenCV
                    if pix.n == 4:  # RGBA
                        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)
                    else:  # RGB
                        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                    
                    # Odczytywanie kodów kreskowych
                    detected_barcodes = pyzbar.decode(img_array)
                    for barcode in detected_barcodes:
                        all_codes.append({
                            'type': 'barcode',
                            'data': barcode.data.decode('utf-8'),
                            'format': barcode.type,
                            'confidence': 1.0,
                            'page': page_num + 1,
                            'bounds': {
                                'x': barcode.rect.left,
                                'y': barcode.rect.top,
                                'width': barcode.rect.width,
                                'height': barcode.rect.height
                            }
                        })
                    
                    # Odczytywanie kodów QR
                    decoded_text = qreader.detect_and_decode(image=img_array)
                    if decoded_text:
                        all_codes.append({
                            'type': 'qr',
                            'data': decoded_text,
                            'format': 'QR_CODE',
                            'confidence': 1.0,
                            'page': page_num + 1
                        })
                
                doc.close()
            else:
                # Dla obrazów - bezpośrednie odczytywanie
                img_array = cv2.imread(temp_path)
                qreader = QReader()
                
                # Odczytywanie kodów kreskowych
                detected_barcodes = pyzbar.decode(img_array)
                for barcode in detected_barcodes:
                    all_codes.append({
                        'type': 'barcode',
                        'data': barcode.data.decode('utf-8'),
                        'format': barcode.type,
                        'confidence': 1.0,
                        'bounds': {
                            'x': barcode.rect.left,
                            'y': barcode.rect.top,
                            'width': barcode.rect.width,
                            'height': barcode.rect.height
                        }
                    })
                
                # Odczytywanie kodów QR
                decoded_text = qreader.detect_and_decode(image=img_array)
                if decoded_text:
                    all_codes.append({
                        'type': 'qr',
                        'data': decoded_text,
                        'format': 'QR_CODE',
                        'confidence': 1.0
                    })
        
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
        return jsonify({
            'success': True,
            'codes': all_codes,
            'barcodes': [code for code in all_codes if code['type'] == 'barcode'],
            'qrCodes': [code for code in all_codes if code['type'] == 'qr'],
            'totalCount': len(all_codes),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'message': f'Błąd podczas odczytywania kodów: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health():
    """Endpoint sprawdzający stan serwisu"""
    return jsonify({'status': 'healthy', 'service': 'PythonPdfService'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5032, debug=True) 