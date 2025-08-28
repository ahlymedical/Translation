import functions_framework
import requests
from flask import jsonify

# إعدادات واجهة برمجة التطبيقات (API) الخاصة بالترجمة
# !! هام: استبدل هذه القيم بالقيم الحقيقية من مزود الخدمة الذي اخترته
TRANSLATION_API_ENDPOINT = "https://api.example-translator.com/v1/document-translation"
API_KEY = "YOUR_SECRET_API_KEY"

@functions_framework.http
def translate_word_file(request):
    """
    دالة HTTP Cloud Function لاستقبال ملف وورد، إرساله للترجمة، وإعادته.
    """
    # التعامل مع طلبات CORS Preflight (ضروري للتواصل بين الواجهة والمخدم)
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    # السماح بالوصول من أي مصدر
    headers = {
        'Access-Control-Allow-Origin': '*'
    }

    if 'file' not in request.files:
        return (jsonify({"error": "No file part in the request"}), 400, headers)

    file = request.files['file']

    if file.filename == '':
        return (jsonify({"error": "No file selected"}), 400, headers)

    if file:
        try:
            # تجهيز الطلب لواجهة برمجة تطبيقات الترجمة
            api_headers = {
                'Authorization': f'Bearer {API_KEY}',
                # بعض الواجهات قد تتطلب headers أخرى، راجع توثيق الخدمة
            }
            files_to_send = {
                'file': (file.filename, file.read(), file.content_type)
                # قد تحتاج لإضافة بيانات أخرى مثل 'target_language': 'ar'
                # 'data': {'target_language': 'ar'}
            }

            # إرسال الملف إلى خدمة الترجمة
            response = requests.post(TRANSLATION_API_ENDPOINT, headers=api_headers, files=files_to_send)

            # التأكد من أن الطلب كان ناجحاً
            response.raise_for_status()

            # إعادة الملف المترجم مباشرةً إلى المستخدم
            # ملاحظة: يجب أن تكون استجابة الـ API هي الملف نفسه
            return (response.content, 200, {
                **headers, # دمج headers السماح بالوصول
                'Content-Type': response.headers.get('Content-Type', 'application/octet-stream'),
                'Content-Disposition': f'attachment; filename="translated_{file.filename}"'
            })

        except requests.exceptions.RequestException as e:
            # التعامل مع أخطاء الاتصال بخدمة الترجمة
            return (jsonify({"error": f"API request failed: {e}"}), 502, headers) # 502 Bad Gateway
        except Exception as e:
            # التعامل مع أي أخطاء أخرى
            return (jsonify({"error": f"An internal server error occurred: {e}"}), 500, headers)
    
    return (jsonify({"error": "Invalid request"}), 400, headers)
