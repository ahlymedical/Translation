import os
import io
import google.generativeai as genai
import docx
import PyPDF2
from PIL import Image
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# --- الإعدادات ---
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# --- إعداد Gemini API ---
model = None
api_key_error = None
try:
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    if not GEMINI_API_KEY:
        api_key_error = "لم يتم العثور على متغير البيئة GEMINI_API_KEY"
        raise ValueError(api_key_error)
    
    genai.configure(api_key=GEMINI_API_KEY)
    # نستخدم نموذج 1.5 Pro لدعم الصور والملفات المعقدة
    model = genai.GenerativeModel('gemini-1.5-pro-latest')
    print("تم إعداد Gemini API بنجاح باستخدام نموذج 1.5 Pro.")
except Exception as e:
    print(f"!!!!!! خطأ فادح في إعداد Gemini API: {e}")
    if not api_key_error:
        api_key_error = str(e)

# --- دوال مساعدة لاستخراج النصوص ---
def read_text_from_docx(file_stream):
    doc = docx.Document(file_stream)
    return '\n'.join([para.text for para in doc.paragraphs])

def read_text_from_pdf(file_stream):
    reader = PyPDF2.PdfReader(file_stream)
    text = []
    for page in reader.pages:
        text.append(page.extract_text())
    return '\n'.join(text)

# --- نقاط الدخول (Routes) ---

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/translate-file', methods=['POST'])
def translate_file_handler():
    if not model:
        return jsonify({"error": f"Gemini API غير مُهيأ: {api_key_error}"}), 500

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    source_lang = request.form.get('source_lang', 'auto')
    target_lang = request.form.get('target_lang', 'English')
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        filename = file.filename.lower()
        content_to_translate = None
        
        if filename.endswith('.docx'):
            content_to_translate = read_text_from_docx(file.stream)
        elif filename.endswith('.pdf'):
            content_to_translate = read_text_from_pdf(file.stream)
        elif filename.endswith(('.png', '.jpg', '.jpeg')):
            image = Image.open(file.stream)
            # Gemini 1.5 Pro يمكنه التعامل مع الصور مباشرة
            response = model.generate_content([
                f"Extract the text from this image and translate it professionally to {target_lang}. If the text is already in {target_lang}, refine it. Provide only the final text.", 
                image
            ])
            return jsonify({"translated_text": response.text})
        else:
            return jsonify({"error": "Unsupported file type"}), 400

        if not content_to_translate or not content_to_translate.strip():
            return jsonify({"error": "Could not extract text from the file or the file is empty."}), 400

        prompt = (
            f"You are an expert multilingual translator for a medical services company. "
            f"Translate the following text from '{source_lang}' to '{target_lang}'. "
            "The translation must be professional, accurate, and context-aware. "
            "Do not add any introductions, summaries, or notes. "
            "Preserve formatting like paragraphs. Provide only the translated text.\n\n"
            f"--- TEXT ---\n{content_to_translate}"
        )
        
        response = model.generate_content(prompt)
        return jsonify({"translated_text": response.text})

    except Exception as e:
        print(f"!!!!!! حدث خطأ أثناء معالجة الملف: {e}")
        return jsonify({"error": f"An internal server error occurred: {str(e)}"}), 500

@app.route('/translate-text', methods=['POST'])
def translate_text_handler():
    if not model:
        return jsonify({"error": f"Gemini API غير مُهيأ: {api_key_error}"}), 500

    data = request.get_json()
    text = data.get('text')
    source_lang = data.get('source_lang', 'auto')
    target_lang = data.get('target_lang', 'English')

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        prompt = (
            f"You are an expert multilingual translator. "
            f"Translate the following text from '{source_lang}' to '{target_lang}'. "
            "The translation must be professional and accurate. "
            "Provide only the translated text.\n\n"
            f"--- TEXT ---\n{text}"
        )
        response = model.generate_content(prompt)
        return jsonify({"translated_text": response.text})
    except Exception as e:
        print(f"!!!!!! حدث خطأ أثناء ترجمة النص: {e}")
        return jsonify({"error": f"An internal server error occurred: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=True, host='0.0.0.0', port=port)
