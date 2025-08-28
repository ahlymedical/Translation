document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const uploadArea = document.getElementById('upload-area');
    const statusArea = document.getElementById('status-area');
    const statusText = document.getElementById('status-text');
    const resultArea = document.getElementById('result-area');
    const translatedTextArea = document.getElementById('translated-text');

    // !!!!!! هام جداً: استبدل هذا الرابط بالرابط الخاص بك وأضف /translate في النهاية
    const CLOUD_RUN_URL = 'https://translation-929510129831.europe-west1.run.app/translate';

    fileInput.addEventListener('change', () => {
        fileNameDisplay.textContent = fileInput.files.length > 0 ? fileInput.files[0].name : 'انقر هنا لاختيار ملف وورد';
    });

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (fileInput.files.length === 0) {
            alert('الرجاء اختيار ملف أولاً.');
            return;
        }

        const file = fileInput.files[0];
        if (!file.name.endsWith('.docx')) {
             alert('الرجاء رفع ملف بصيغة .docx فقط.');
             return;
        }
        
        const formData = new FormData();
        formData.append('file', file);

        uploadArea.style.display = 'none';
        resultArea.style.display = 'none';
        statusArea.style.display = 'block';
        statusText.textContent = 'جاري رفع الملف وترجمته...';

        try {
            const response = await fetch(CLOUD_RUN_URL, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'حدث خطأ غير متوقع.');
            }
            
            statusArea.style.display = 'none';
            translatedTextArea.value = data.translated_text;
            resultArea.style.display = 'block';
            
        } catch (error) {
            console.error('Error:', error);
            statusText.textContent = `فشل: ${error.message}`;
        } finally {
            // اسمح للمستخدم برفع ملف آخر بغض النظر عن النتيجة
            uploadArea.style.display = 'block';
            fileInput.value = ''; // إعادة تعيين حقل الإدخال
            fileNameDisplay.textContent = 'انقر هنا لاختيار ملف وورد';
        }
    });
});
