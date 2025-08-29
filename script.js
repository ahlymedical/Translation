document.addEventListener('DOMContentLoaded', () => {
    const FILE_TRANSLATE_URL = '/translate-file';
    const TEXT_TRANSLATE_URL = '/translate-text';

    const fileForm = document.getElementById('file-upload-form');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const uploadArea = document.getElementById('upload-area');
    const fileStatusContainer = document.getElementById('file-status-container');
    const translateFileBtn = document.getElementById('translate-file-btn');
    const dynamicUploadIcon = document.getElementById('dynamic-upload-icon');
    
    const sourceTextArea = document.getElementById('source-text');
    const targetTextArea = document.getElementById('target-text');
    const copyBtn = document.getElementById('copy-btn');
    const autoDetectBtn = document.getElementById('auto-detect-btn');

    const languages = {
        'Arabic': 'ar', 'English': 'en', 'French': 'fr', 'German': 'de', 'Spanish': 'es', 
        'Italian': 'it', 'Portuguese': 'pt', 'Dutch': 'nl', 'Russian': 'ru', 'Turkish': 'tr',
        'Japanese': 'ja', 'Korean': 'ko', 'Chinese (Simplified)': 'zh-CN', 'Hindi': 'hi',
        'Indonesian': 'id', 'Polish': 'pl', 'Swedish': 'sv', 'Vietnamese': 'vi'
    };

    const fileIcons = {
        'default': 'https://api.iconify.design/solar/cloud-upload-bold.svg?color=%2300653e',
        'docx': 'https://api.iconify.design/vscode-icons/file-type-word.svg',
        'pptx': 'https://api.iconify.design/vscode-icons/file-type-powerpoint.svg',
        'pdf': 'https://api.iconify.design/vscode-icons/file-type-pdf2.svg',
        'image': 'https://api.iconify.design/solar/gallery-bold-duotone.svg?color=%2300653e'
    };
    
    function populateLanguageSelectors() {
        const selectors = document.querySelectorAll('select');
        selectors.forEach(selector => {
            const isSource = selector.id.includes('source');
            selector.innerHTML = isSource ? '<option value="auto">Auto-Detect / كشف تلقائي</option>' : '';
            
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

    function resetFileUI() {
        fileInput.value = ''; // Clear the file input
        fileNameDisplay.querySelector('.en b').textContent = 'Click to upload';
        fileNameDisplay.querySelector('.ar b').textContent = 'انقر للرفع';
        dynamicUploadIcon.src = fileIcons.default;
    }

    async function handleFileSubmit(e) {
        e.preventDefault();
        if (fileInput.files.length === 0) {
            showFileStatus('Please select a file first. / الرجاء اختيار ملف أولاً.', true);
            return;
        }

        const formData = new FormData(fileForm);
        showFileStatus('Processing... This may take a moment. / جاري المعالجة...');
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
            // Reset the UI for the next upload after a delay
            setTimeout(() => {
                resetFileUI();
            }, 4000);
        }
    }

    async function handleTextTranslation(isAutoDetect = false) {
        const text = sourceTextArea.value.trim();
        if (!text) {
            targetTextArea.value = '';
            return;
        }
        targetTextArea.placeholder = "Translating... / جاري الترجمة...";
        
        const sourceLang = isAutoDetect ? 'auto' : document.getElementById('text-source-lang').value;
        if(isAutoDetect){
            document.getElementById('text-source-lang').value = 'auto';
        }

        try {
            const response = await fetch(TEXT_TRANSLATE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    source_lang: sourceLang,
                    target_lang: document.getElementById('text-target-lang').value
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            targetTextArea.value = data.translated_text;
        } catch (error) {
            targetTextArea.value = `Error: ${error.message}`;
            console.error('Text Translation Error:', error);
        } finally {
            targetTextArea.placeholder = "Translation... / الترجمة...";
        }
    }

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileNameDisplay.querySelector('.en b').textContent = file.name;
            fileNameDisplay.querySelector('.ar b').textContent = '';
            fileStatusContainer.style.display = 'none';

            const extension = file.name.split('.').pop().toLowerCase();
            if (['docx', 'doc'].includes(extension)) dynamicUploadIcon.src = fileIcons.docx;
            else if (['pptx', 'ppt'].includes(extension)) dynamicUploadIcon.src = fileIcons.pptx;
            else if (extension === 'pdf') dynamicUploadIcon.src = fileIcons.pdf;
            else if (['png', 'jpg', 'jpeg'].includes(extension)) dynamicUploadIcon.src = fileIcons.image;
            else dynamicUploadIcon.src = fileIcons.default;
        }
    });
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eName => uploadArea.addEventListener(eName, e => { e.preventDefault(); e.stopPropagation(); }));
    ['dragenter', 'dragover'].forEach(eName => uploadArea.addEventListener(eName, () => uploadArea.classList.add('dragover')));
    ['dragleave', 'drop'].forEach(eName => uploadArea.addEventListener(eName, () => uploadArea.classList.remove('dragover')));
    uploadArea.addEventListener('drop', e => {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
    });

    fileForm.addEventListener('submit', handleFileSubmit);
    
    let debounceTimer;
    sourceTextArea.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => handleTextTranslation(false), 800);
    });

    autoDetectBtn.addEventListener('click', () => handleTextTranslation(true));

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
