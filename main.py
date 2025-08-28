import os
import google.generativeai as genai
import docx
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- الإعدادات ---
# 1. إنشاء تطبيق فلاسك
app = Flask(__name__)

# 2. السماح للطلبات من أي مصدر (ضروري لربط الواجهة الأمامية بالخلفية)
CORS(app)

# 3. إعداد Gemini API باستخدام المفتاح الذي وضعته في Google Cloud
# تأكد من أن اسم المتغير في Google Cloud هو GEMINI_API_KEY
try:
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    if not GEMINI_API_KEY:
        raise ValueError("لم يتم العثور على مفتاح GEMINI_API_KEY")
    
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    print("تم إعداد Gemini API بنجاح.")
except Exception as e:
    print(f"!!!!!! خطأ فادح في إعداد Gemini API: {e}")
    model = None

# --- الدوال المساعدة ---
def read_text_from_docx(file_stream):
    """تقرأ النص من ملف وورد."""
    try:
        doc = docx.Document(file_stream)
        full_text = [para.text for para in doc.paragraphs]
        return '\n'.join(full_text)
    except Exception as e:
        print(f"خطأ أثناء قراءة ملف docx: {e}")
        return None

# --- نقاط الدخول (Routes) ---

# نقطة دخول أساسية للتأكد من أن الخادم يعمل
@app.route('/')
def health_check():
    return "<h1>الخادم يعمل بنجاح!</h1>"

# نقطة الدخول الخاصة بالترجمة
@app.route('/translate', methods=['POST'])
def translate_document():
    if not model:
        return jsonify({"error": "Gemini API غير مُهيأ بشكل صحيح على الخادم."}), 500

    if 'file' not in request.files:
        return jsonify({"error": "لا يوجد ملف في الطلب"}), 400

    file = request.files['file']

    if file.filename == '' or not file.filename.endswith('.docx'):
        return jsonify({"error": "الرجاء رفع ملف بصيغة .docx"}), 400

    try:
        original_text = read_text_from_docx(file.stream)
        if not original_text or not original_text.strip():
            return jsonify({"error": "لا يمكن استخلاص النص من الملف أو الملف فارغ."}), 400

        prompt = (
            "You are a professional document translator. "
            "Translate the following text into flawless Arabic. "
            "Do not add any comments, introductions, or extra formatting. "
            "Preserve the paragraphs and line breaks as much as possible. "
            "Provide only the direct translation of the text below:\n\n"
            f"--- TEXT START ---\n{original_text}\n--- TEXT END ---"
        )
        
        response = model.generate_content(prompt)
        translated_text = response.text

        return jsonify({"translated_text": translated_text})

    except Exception as e:
        print(f"!!!!!! حدث خطأ أثناء عملية الترجمة: {e}")
        return jsonify({"error": f"حدث خطأ داخلي في الخادم: {e}"}), 500

# هذا الجزء للتشغيل المحلي فقط، gunicorn سيهتم بالباقي على الخادم
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=True, host='0.0.0.0', port=port)
