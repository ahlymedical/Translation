import os
import io
import traceback
import google.generativeai as genai
import docx
import PyPDF2
from PIL import Image
from pptx import Presentation
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename # Import secure_filename for safety

# --- Settings ---
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# --- Gemini API Setup ---
model = None
api_key_error = None
try:
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable not set or found.")
    
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-pro-latest') 
    print("✅ Gemini API configured successfully with gemini-1.5-pro-latest model.")
except Exception as e:
    api_key_error = str(e)
    print(f"!!!!!! FATAL ERROR during Gemini API setup: {api_key_error}")

# --- Text Extraction Helper Functions ---
def read_text_from_docx(stream):
    doc = docx.Document(stream)
    return '\n'.join([para.text for para in doc.paragraphs if para.text.strip()])

def read_text_from_pdf(stream):
    reader = PyPDF2.PdfReader(stream)
    return '\n'.join([page.extract_text() for page in reader.pages if page.extract_text()])

def read_text_from_pptx(stream):
    prs = Presentation(stream)
    text_runs = []
    for slide in prs.slides:
        for shape in slide.shapes:
            if not shape.has_text_frame:
                continue
            for paragraph in shape.text_frame.paragraphs:
                for run in paragraph.runs:
                    text_runs.append(run.text)
    return '\n'.join(text_runs)

def create_docx_from_text(text):
    mem_file = io.BytesIO()
    doc = docx.Document()
    for paragraph in text.split('\n'):
        doc.add_paragraph(paragraph)
    doc.save(mem_file)
    mem_file.seek(0)
    return mem_file

# --- Application Routes (Endpoints) ---

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/translate-file', methods=['POST'])
def translate_file_handler():
    print("--- Received request for /translate-file ---") # New log entry
    if not model:
        print(f"❌ Error: Translate-file request failed because Gemini model is not initialized. Reason: {api_key_error}")
        return jsonify({"error": f"API service is not configured. Please contact support. Reason: {api_key_error}"}), 500

    if 'file' not in request.files:
        print("❌ Error: No 'file' part in the request files.")
        return jsonify({"error": "No file part in the request."}), 400

    file = request.files['file']
    
    if file.filename == '':
        print("❌ Error: No file selected (filename is empty).")
        return jsonify({"error": "No file selected."}), 400
    
    # Use secure_filename to prevent malicious file names
    filename = secure_filename(file.filename).lower()
    print(f"Processing file: {filename}")

    try:
        source_lang = request.form.get('source_lang', 'auto')
        target_lang = request.form.get('target_lang', 'English')
        translated_text = ""
        
        if filename.endswith(('.png', '.jpg', '.jpeg')):
            print("Image file detected. Processing with vision model.")
            image = Image.open(file.stream)
            prompt_parts = [
                f"Your task is to extract any text from the following image and then translate that extracted text professionally into {target_lang}. You must provide ONLY the final translated text and nothing else.",
                image,
            ]
            response = model.generate_content(prompt_parts)
            translated_text = response.text
            print("Image translation successful.")

        elif filename.endswith(('.docx', '.pdf', '.pptx')):
            original_text = ""
            if filename.endswith('.docx'):
                original_text = read_text_from_docx(file.stream)
            elif filename.endswith('.pdf'):
                original_text = read_text_from_pdf(file.stream)
            elif filename.endswith('.pptx'):
                original_text = read_text_from_pptx(file.stream)

            if not original_text or not original_text.strip():
                print("⚠️ Warning: Could not extract text from document or document is empty.")
                return jsonify({"error": "Could not extract any text from the document or the file is empty."}), 400
            
            print(f"Text extracted. Translating from '{source_lang}' to '{target_lang}'...")
            prompt = (
                f"Translate the following text from '{source_lang}' to '{target_lang}'. "
                "Provide only the professional, accurate translated text.\n\n"
                f"--- TEXT ---\n{original_text}"
            )
            response = model.generate_content(prompt)
            translated_text = response.text
            print("Document text translation successful.")
        else:
            return jsonify({"error": "Unsupported file type."}), 400

        print("Creating downloadable .docx file.")
        translated_doc_stream = create_docx_from_text(translated_text)
        new_filename = f"translated_{os.path.splitext(file.filename)[0]}.docx"

        return send_file(
            translated_doc_stream,
            as_attachment=True,
            download_name=new_filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except Exception as e:
        print(f"!!!!!! CRITICAL ERROR during file processing for {filename}: {e}")
        detailed_error = traceback.format_exc()
        print(detailed_error)
        return jsonify({"error": "An internal server error occurred during file processing. Please check the logs."}), 500

# The /translate-text endpoint remains unchanged as it is working correctly.
@app.route('/translate-text', methods=['POST'])
def translate_text_handler():
    # ... (code for this function is unchanged) ...
    if not model:
        return jsonify({"error": f"API service is not configured. Please contact support. Reason: {api_key_error}"}), 500
    data = request.get_json()
    text = data.get('text')
    if not text:
        return jsonify({"error": "No text provided."}), 400
    source_lang = data.get('source_lang', 'auto')
    target_lang = data.get('target_lang', 'English')
    try:
        prompt = (f"Translate the following text from '{source_lang}' to '{target_lang}'. Provide only the professional and accurate translated text.\n\n{text}")
        response = model.generate_content(prompt)
        return jsonify({"translated_text": response.text})
    except Exception as e:
        print(f"!!!!!! An error occurred during text translation: {e}")
        traceback.print_exc()
        return jsonify({"error": "An internal error occurred during translation. Please try again."}), 500

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=False, host='0.0.0.0', port=port)
