import os
import io
import google.generativeai as genai
import docx
import PyPDF2
from PIL import Image
from pptx import Presentation
from flask import Flask, request, jsonify, send_file
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
        raise ValueError("لم يتم العثور على متغير البيئة GEMINI_API_KEY")
    
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-pro-latest')
    print("تم إعداد Gemini API بنجاح.")
except Exception as e:
    print(f"!!!!!! خطأ فادح في إعداد Gemini API: {e}")
    api_key_error = str(e)

# --- دوال مساعدة لاستخراج النصوص ---
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
    """ينشئ ملف وورد من النص ويعيده كملف في الذاكرة."""
    doc = docx.Document()
    for paragraph in text.split('\n'):
        doc.add_paragraph(paragraph)
    
    # حفظ الملف في الذاكرة
    mem_file = io.BytesIO()
    doc.save(mem_file)
    mem_file.seek(0)
    return mem_file

# --- نقاط الدخول (Routes) ---

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

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
            original_text = response.text # النص المستخرج والمترجم مباشرة
        else:
            return jsonify({"error": "Unsupported file type"}), 400

        if not original_text or not original_text.strip():
            return jsonify({"error": "Could not extract text from the file."}), 400

        # إذا لم يكن الملف صورة، نقوم بالترجمة الآن
        if not filename.endswith(('.png', '.jpg', '.jpeg')):
            prompt = (
                f"You are an expert multilingual translator. Translate the following text from '{source_lang}' to '{target_lang}'. "
                "The translation must be professional and accurate. Provide only the translated text.\n\n"
                f"--- TEXT ---\n{original_text}"
            )
            response = model.generate_content(prompt)
            translated_text = response.text
        else:
            translated_text = original_text # الترجمة تمت بالفعل للصور

        # إنشاء ملف docx جديد بالترجمة
        translated_doc_stream = create_docx_from_text(translated_text)
        
        new_filename = f"translated_{os.path.splitext(file.filename)[0]}.docx"

        return send_file(
            translated_doc_stream,
            as_attachment=True,
            download_name=new_filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except Exception as e:
        print(f"!!!!!! حدث خطأ أثناء معالجة الملف: {e}")
        # إرجاع خطأ بصيغة JSON يمكن للواجهة الأمامية قراءته
        error_response = jsonify({"error": f"An internal server error occurred: {str(e)}"})
        error_response.status_code = 500
        return error_response

@app.route('/translate-text', methods=['POST'])
def translate_text_handler():
    if not model:
        return jsonify({"error": f"Gemini API غير مُهيأ: {api_key_error}"}), 500

    data = request.get_json()
    text = data.get('text')
    target_lang = data.get('target_lang', 'English')

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        prompt = f"Translate the following text to '{target_lang}'. Provide only the translated text.\n\n{text}"
        response = model.generate_content(prompt)
        return jsonify({"translated_text": response.text})
    except Exception as e:
        print(f"!!!!!! حدث خطأ أثناء ترجمة النص: {e}")
        return jsonify({"error": f"An internal server error occurred: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=True, host='0.0.0.0', port=port)
