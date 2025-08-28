import os
import google.generativeai as genai
import docx # لمكتبة python-docx
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- الإعدادات ---
# إنشاء تطبيق فلاسك. هذا هو متغير "app" الذي يبحث عنه gunicorn
app = Flask(__name__)
# السماح للطلبات من أي مصدر (ضروري لربط الواجهة الأمامية بالخلفية)
CORS(app)

# إعداد Gemini API باستخدام المفتاح الذي وضعته في Google Cloud
try:
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash') # استخدام نموذج سريع وفعال
except Exception as e:
    print(f"خطأ في إعداد Gemini API: {e}")
    model = None

# --- الدالة المساعدة لقراءة النص من ملف الوورد ---
def read_text_from_docx(file_stream):
    try:
        doc = docx.Document(file_stream)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        # يمكنك إضافة قراءة الجداول هنا إذا أردت
        # for table in doc.tables:
        #     for row in table.rows:
        #         for cell in row.cells:
        #             full_text.append(cell.text)
        return '\n'.join(full_text)
    except Exception as e:
        print(f"Error reading docx file: {e}")
        return None

# --- نقطة الدخول الرئيسية للتطبيق ---
@app.route('/translate', methods=['POST'])
def translate_document():
    if not model:
        return jsonify({"error": "Gemini API is not configured correctly on the server."}), 500

    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if file and file.filename.endswith(('.docx')):
        try:
            # قراءة النص من الملف
            original_text = read_text_from_docx(file.stream)
            if original_text is None or not original_text.strip():
                 return jsonify({"error": "Could not extract text from the document or the document is empty."}), 400

            # بناء الطلب لـ Gemini
            prompt = f"Please translate the following text to Arabic professionally, without adding any introductions or conclusions, just provide the direct translation:\n\n---\n\n{original_text}"
            
            # إرسال الطلب للترجمة
            response = model.generate_content(prompt)
            
            translated_text = response.text

            # إعادة النص المترجم
            return jsonify({"translated_text": translated_text})

        except Exception as e:
            print(f"An error occurred during translation: {e}")
            return jsonify({"error": f"An internal server error occurred: {e}"}), 500
    else:
        return jsonify({"error": "Invalid file type. Please upload a .docx file."}), 400

# الأمر التالي ضروري للتشغيل المحلي فقط، Cloud Run يستخدم gunicorn
if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
