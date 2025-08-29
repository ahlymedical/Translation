import os
import io
import traceback
import google.generativeai as genai
import docx
from docx.document import Document as DocxDocument
import PyPDF2
from PIL import Image
from pptx import Presentation
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

model = None
try:
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable not set.")
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-pro-latest')
    print("✅ Gemini API configured successfully.")
except Exception as e:
    print(f"!!!!!! FATAL ERROR during Gemini API setup: {e}")

def translate_text_api(text_to_translate, target_lang):
    if not text_to_translate or not text_to_translate.strip():
        return ""
    try:
        prompt = f"You are an expert multilingual translator. Translate the following text to {target_lang}. Understand the context professionally. Provide only the translated text, nothing else:\n\n{text_to_translate}"
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"--- API translation error for a chunk: {e}")
        return text_to_translate

def translate_docx_in_place(doc: DocxDocument, target_lang: str):
    print("Starting in-place DOCX translation (paragraph by paragraph)...")
    for para in doc.paragraphs:
        if para.text.strip():
            original_text = para.text
            translated_text = translate_text_api(original_text, target_lang)
            para.text = translated_text
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    if para.text.strip():
                        original_text = para.text
                        translated_text = translate_text_api(original_text, target_lang)
                        para.text = translated_text
    print("In-place DOCX translation finished.")
    return doc

def read_text_from_pdf(stream):
    reader = PyPDF2.PdfReader(stream)
    return '\n'.join([page.extract_text() for page in reader.pages if page.extract_text()])

def read_text_from_pptx(stream):
    prs = Presentation(stream)
    text_runs = []
    for slide in prs.slides:
        for shape in slide.shapes:
            if shape.has_text_frame:
                for paragraph in shape.text_frame.paragraphs:
                    text_runs.append(paragraph.text)
    return '\n'.join(text_runs)

def create_docx_from_text(text):
    mem_file = io.BytesIO()
    doc = docx.Document()
    doc.add_paragraph(text)
    doc.save(mem_file)
    mem_file.seek(0)
    return mem_file

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/translate-file', methods=['POST'])
def translate_file_handler():
    if not model: return jsonify({"error": "API service is not configured."}), 500
    if 'file' not in request.files: return jsonify({"error": "No file part in the request."}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({"error": "No file selected."}), 400

    filename = secure_filename(file.filename)
    target_lang = request.form.get('target_lang', 'English')
    
    try:
        if filename.lower().endswith('.docx'):
            original_doc = docx.Document(file.stream)
            translated_doc = translate_docx_in_place(original_doc, target_lang)
            mem_file = io.BytesIO()
            translated_doc.save(mem_file)
            mem_file.seek(0)
            return send_file(mem_file, as_attachment=True, download_name=f"translated_{filename}", mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document')

        text_to_translate = ""
        if filename.lower().endswith('.pdf'):
            text_to_translate = read_text_from_pdf(file.stream)
        elif filename.lower().endswith('.pptx'):
            text_to_translate = read_text_from_pptx(file.stream)
        elif filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            image = Image.open(file.stream)
            response = model.generate_content([f"Extract text from this image and translate it to {target_lang}. Provide only the translated text.", image])
            text_to_translate = response.text
        
        if not text_to_translate.strip():
            return jsonify({"error": "Could not extract text from file or file is empty."}), 400

        prompt = f"Translate the following text to {target_lang}. Provide only the professional translated text.\n\n{text_to_translate}"
        response = model.generate_content(prompt)
        translated_doc_stream = create_docx_from_text(response.text)
        return send_file(translated_doc_stream, as_attachment=True, download_name=f"translated_{os.path.splitext(filename)[0]}.docx", mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document')

    except Exception as e:
        print(f"!!!!!! CRITICAL ERROR in translate_file_handler: {e}")
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred during processing."}), 500

@app.route('/translate-text', methods=['POST'])
def translate_text_handler():
    if not model: return jsonify({"error": "API service is not configured."}), 500
    data = request.get_json()
    text = data.get('text', '')
    target_lang = data.get('target_lang', 'English')
    prompt = f"Translate the following text to {target_lang}:\n\n{text}"
    response = model.generate_content(prompt)
    return jsonify({"translated_text": response.text})

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)```

---

#### الملف الرابع: `index.html` (الهيكل النهائي)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AMC GlobalTranslate | AI Tran
