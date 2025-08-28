document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const uploadArea = document.getElementById('upload-area');
    const statusArea = document.getElementById('status-area');
    const statusText = document.getElementById('status-text');
    
    // العناصر الجديدة
    const resultArea = document.getElementById('result-area');
    const translatedTextArea = document.getElementById('translated-text');

    // !! هام جداً: ضع رابط الخدمة الخاص بك هنا وأضف /translate في النهاية
    const CLOUD_RUN_URL = 'https://translation-929510129831.europe-west1.run.app/translate';

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = fileInput.files[0].name;
        } else {
            fileNameDisplay.textContent = 'انقر هنا لاختيار ملف وورد';
        }
    });

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (fileInput.files.length === 0) {
            alert('الرجاء اختيار ملف أولاً.');
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        // إخفاء وإظهار العناصر المناسبة
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
            
            // عرض النتائج
            statusArea.style.display = 'none';
            translatedTextArea.value = data.translated_text;
            resultArea.style.display = 'block';
            uploadArea.style.display = 'block'; // السماح برفع ملف آخر


        } catch (error) {
            console.error('Error:', error);
            statusText.textContent = `فشل: ${error.message}`;
            
            // إتاحة الفرصة للمستخدم للمحاولة مرة أخرى
            setTimeout(() => {
                uploadArea.style.display = 'block';
                statusArea.style.display = 'none';
            }, 5000);
        }
    });
});
