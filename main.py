import os
import io
import google.generativeai as genai
import docx
import PyPDF2
from PIL import Image
from pptx import Presentation
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# --- Settings ---
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# --- Gemini API Setup ---
model = None
api_key_error = None
try:
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable not found.")
    
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-pro-latest')
    print("Gemini API configured successfully with 1.5 Pro model.")
except Exception as e:
    print(f"!!!!!! FATAL ERROR during Gemini API setup: {e}")
    api_key_error = str(e)

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
    """Creates a Word document from text and returns it as an in-memory file."""
    doc = docx.Document()
    for paragraph in text.split('\n'):
        doc.add_paragraph(paragraph)
    
    mem_file = io.BytesIO()
    doc.save(mem_file)
    mem_file.seek(0)
    return mem_file

# --- Application Routes (Endpoints) ---

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/translate-file', methods=['POST'])
def translate_file_handler():
    if not model:
        return jsonify({"error": f"Gemini API is not configured: {api_key_error}"}), 500

    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request."}), 400

    file = request.files['file']
    source_lang = request.form.get('source_lang', 'auto')
    target_lang = request.form.get('target_lang', 'English')
    
    if file.filename == '':
        return jsonify({"error": "No file selected."}), 400

    try:
        filename = file.filename.lower()
        original_text = None
        
        if filename.endswith('.docx'):
            original_text = read_text_from_docx(file.stream)
        elif filename.endswith('.pdf'):
            original_text = read_text_from_pdf(file.stream)
        elif filename.endswith('.pptx'):
            original_text = read_text_from_pptx(file.stream)
        elif filename.endswith(('.png', '.jpg', '.jpeg')):
            image = Image.open(file.stream)
            response = model.generate_content([
                f"Extract text from this image and translate it to {target_lang}. Provide only the translated text.", image
            ])
            original_text = response.text
        else:
            return jsonify({"error": "Unsupported file type."}), 400

        if not original_text or not original_text.strip():
            return jsonify({"error": "Could not extract text from the file or the file is empty."}), 400

        if not filename.endswith(('.png', '.jpg', '.jpeg')):
            prompt = (
                f"You are an expert multilingual translator. Translate the following text from '{source_lang}' to '{target_lang}'. "
                "The translation must be professional and accurate. Provide only the translated text.\n\n"
                f"--- TEXT ---\n{original_text}"
            )
            response = model.generate_content(prompt)
            translated_text = response.text
        else:
            translated_text = original_text

        translated_doc_stream = create_docx_from_text(translated_text)
        
        new_filename = f"translated_{os.path.splitext(file.filename)[0]}.docx"

        return send_file(
            translated_doc_stream,
            as_attachment=True,
            download_name=new_filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except Exception as e:
        print(f"!!!!!! An error occurred during file processing: {e}")
        error_response = jsonify({"error": f"An internal server error occurred: {str(e)}"})
        error_response.status_code = 500
        return error_response

@app.route('/translate-text', methods=['POST'])
def translate_text_handler():
    if not model:
        return jsonify({"error": f"Gemini API is not configured: {api_key_error}"}), 500

    data = request.get_json()
    text = data.get('text')
    source_lang = data.get('source_lang', 'auto')
    target_lang = data.get('target_lang', 'English')

    if not text:
        return jsonify({"error": "No text provided."}), 400

    try:
        prompt = (
            f"Translate the following text from '{source_lang}' to '{target_lang}'. "
            "Provide only the professional and accurate translated text.\n\n"
            f"{text}"
        )
        response = model.generate_content(prompt)
        return jsonify({"translated_text": response.text})
    except Exception as e:
        print(f"!!!!!! An error occurred during text translation: {e}")
        return jsonify({"error": f"An internal server error occurred: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=True, host='0.0.0.0', port=port)
