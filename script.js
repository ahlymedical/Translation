document.addEventListener('DOMContentLoaded', () => {
    // --- URLs and Elements ---
    // **الإصلاح الرئيسي**: استخدام مسارات نسبية بدلاً من رابط ثابت
    const FILE_TRANSLATE_URL = '/translate-file';
    const TEXT_TRANSLATE_URL = '/translate-text';

    const fileForm = document.getElementById('file-upload-form');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const uploadArea = document.getElementById('upload-area');
    const fileStatusContainer = document.getElementById('file-status-container');
    const translateFileBtn = document.getElementById('translate-file-btn');
    
    const sourceTextArea = document.getElementById('source-text');
    const targetTextArea = document.getElementById('target-text');
    const copyBtn = document.getElementById('copy-btn');

    const languages = {
        'Arabic': 'ar', 'English': 'en', 'Spanish': 'es', 'French': 'fr', 'German': 'de',
        'Italian': 'it', 'Japanese': 'ja', 'Korean': 'ko', 'Chinese': 'zh',
        'Russian': 'ru', 'Portuguese': 'pt', 'Hindi': 'hi', 'Turkish': 'tr'
    };
    
    function populateLanguageSelectors() {
        const selectors = document.querySelectorAll('select');
        selectors.forEach(selector => {
            if (selector.id.includes('source')) {
                 selector.innerHTML = '<option value="auto">Auto-Detect / كشف تلقائي</option>';
            } else {
                 selector.innerHTML = '';
            }
            for (const name of Object.keys(languages)) {
                selector.add(new Option(name, name));
            }
        });
        document.getElementById('file-target-lang').value = 'Arabic';
        document.getElementById('text-target-lang').value = 'Arabic';
    }

    function showFileStatus(message, isError = false) {
        fileStatusContainer.style.display = 'block';
        fileStatusContainer.textContent = message;
        fileStatusContainer.style.color = isError ? '#d93025' : 'var(--text-secondary)';
        fileStatusContainer.style.backgroundColor = isError ? '#fce8e6' : '#f1f5f9';
    }

    async function handleFileSubmit(e) {
        e.preventDefault();
        if (fileInput.files.length === 0) {
            showFileStatus('Please select a file first. / الرجاء اختيار ملف أولاً.', true);
            return;
        }

        const formData = new FormData(fileForm);
        showFileStatus('Processing... This may take a moment for large files. / جاري المعالجة...');
        translateFileBtn.disabled = true;

        try {
            const response = await fetch(FILE_TRANSLATE_URL, { method: 'POST', body: formData });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'translated_document.docx';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch && filenameMatch.length > 1) {
                    filename = filenameMatch[1];
                }
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
            
            showFileStatus('Translation complete! Download has started. / اكتملت الترجمة! بدأ التحميل.');

        } catch (error) {
            console.error('File Translation Error:', error);
            showFileStatus(`Error: ${error.message}`, true);
        } finally {
            translateFileBtn.disabled = false;
        }
    }

    async function handleTextTranslation() {
        const text = sourceTextArea.value.trim();
        if (!text) {
            targetTextArea.value = '';
            return;
        };
        targetTextArea.placeholder = "Translating... / جاري الترجمة...";
        try {
            const response = await fetch(TEXT_TRANSLATE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    target_lang: document.getElementById('text-target-lang').value
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            targetTextArea.value = data.translated_text;
        } catch (error) {
            targetTextArea.value = `Error: ${error.message}`;
        }
    }

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameDisplay.querySelector('.en b').textContent = fileInput.files[0].name;
            fileNameDisplay.querySelector('.ar b').textContent = '';
            fileStatusContainer.style.display = 'none';
        }
    });
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); });
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'));
    });
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'));
    });
    uploadArea.addEventListener('drop', e => {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
    });

    fileForm.addEventListener('submit', handleFileSubmit);
    
    let debounceTimer;
    sourceTextArea.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleTextTranslation, 800);
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(targetTextArea.value).then(() => {
            copyBtn.title = 'Copied!';
            setTimeout(() => { copyBtn.title = 'Copy text'; }, 2000);
        });
    });

    populateLanguageSelectors();
});

function openTab(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(tl => tl.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
}
