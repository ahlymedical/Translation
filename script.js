document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const uploadArea = document.getElementById('upload-area');
    const statusArea = document.getElementById('status-area');
    const loader = document.getElementById('loader');
    const statusText = document.getElementById('status-text');
    const downloadLink = document.getElementById('download-link');
    const translateBtn = document.getElementById('translate-btn');

    // رابط الدالة السحابية التي أنشأتها على Google Cloud
    const CLOUD_FUNCTION_URL = 'YOUR_GOOGLE_CLOUD_FUNCTION_URL'; // !! هام: استبدل هذا الرابط

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

        // إظهار حالة التحميل وإخفاء منطقة الرفع
        uploadArea.style.display = 'none';
        statusArea.style.display = 'block';
        loader.style.display = 'block';
        downloadLink.style.display = 'none';
        statusText.textContent = 'جاري رفع الملف وترجمته...';

        try {
            const response = await fetch(CLOUD_FUNCTION_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'حدث خطأ غير متوقع.');
            }

            // استلام الملف المترجم كـ blob
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // إعداد رابط التحميل
            loader.style.display = 'none';
            statusText.textContent = 'تمت الترجمة بنجاح!';
            downloadLink.href = url;
            downloadLink.download = `translated-${file.name}`; // اسم الملف الجديد
            downloadLink.style.display = 'block';

        } catch (error) {
            console.error('Error:', error);
            statusText.textContent = `فشل: ${error.message}`;
            loader.style.display = 'none';
            // إتاحة الفرصة للمستخدم للمحاولة مرة أخرى
            setTimeout(() => {
                uploadArea.style.display = 'block';
                statusArea.style.display = 'none';
            }, 4000);
        }
    });
});
