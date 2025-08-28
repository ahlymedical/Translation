document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const uploadArea = document.getElementById('upload-area');
    const statusArea = document.getElementById('status-area');
    const statusText = document.getElementById('status-text');
    
    // العناصر الجديدة التي تم إصلاحها
    const resultArea = document.getElementById('result-area');
    const translatedTextArea = document.getElementById('translated-text');
    const copyBtn = document.getElementById('copy-btn');

    // !! هام: بعد النشر الناجح، استبدل هذا الرابط بالرابط الجديد من Cloud Run
    const CLOUD_RUN_URL = 'https://YOUR_NEW_CLOUD_RUN_URL_HERE/translate';

    // تحديث اسم الملف عند اختياره
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = fileInput.files[0].name;
        } else {
            fileNameDisplay.textContent = 'انقر هنا لاختيار ملف وورد';
        }
    });

    // معالجة عملية الإرسال
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (fileInput.files.length === 0) {
            alert('الرجاء اختيار ملف أولاً.');
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        // تحديث الواجهة: إخفاء منطقة الرفع والنتائج، وإظهار التحميل
        uploadArea.style.display = 'none';
        resultArea.style.display = 'none';
        statusArea.style.display = 'block';
        statusText.textContent = 'جاري رفع الملف وترجمته...';
        copyBtn.textContent = 'نسخ النص';

        try {
            const response = await fetch(CLOUD_RUN_URL, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                // عرض رسالة الخطأ من الخادم إذا كانت موجودة
                throw new Error(data.error || 'حدث خطأ غير متوقع في الخادم.');
            }
            
            // عرض النتائج بنجاح
            statusArea.style.display = 'none';
            translatedTextArea.value = data.translated_text;
            resultArea.style.display = 'block';
            uploadArea.style.display = 'block'; // السماح برفع ملف آخر

        } catch (error) {
            console.error('Error:', error);
            statusText.textContent = `فشل: ${error.message}`;
            
            // إظهار منطقة الرفع مرة أخرى بعد 5 ثوانٍ للسماح بالمحاولة مرة أخرى
            setTimeout(() => {
                uploadArea.style.display = 'block';
                statusArea.style.display = 'none';
            }, 5000);
        }
    });

    // وظيفة زر النسخ
    copyBtn.addEventListener('click', () => {
        translatedTextArea.select();
        document.execCommand('copy');
        copyBtn.textContent = 'تم النسخ!';
    });
});
