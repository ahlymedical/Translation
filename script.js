document.addEventListener('DOMContentLoaded', () => {
    const FILE_TRANSLATE_URL = '/translate-file';
    const TEXT_TRANSLATE_URL = '/translate-text';

    // File translation elements
    const fileForm = document.getElementById('file-upload-form');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const uploadArea = document.getElementById('upload-area');
    const translateFileBtn = document.getElementById('translate-file-btn');
    const dynamicUploadIcon = document.getElementById('dynamic-upload-icon');
    
    // New Progress Bar elements
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const timeEstimate = document.getElementById('time-estimate');

    // Text translation elements
    const sourceTextArea = document.getElementById('source-text');
    const targetTextArea = document.getElementById('target-text');
    const copyBtn = document.getElementById('copy-btn');
    const autoDetectBtn = document.getElementById('auto-detect-btn');
    
    // Global variable to hold the progress interval timer
    let progressInterval = null;

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
            for (const name of Object.keys(languages)) { selector.add(new Option(name, name)); }
        });
        document.getElementById('file-target-lang').value = 'Arabic';
        document.getElementById('text-target-lang').value = 'Arabic';
    }
    
    function startProgressSimulation(fileSize) {
        const estimatedDuration = 20 + (fileSize / 1024 / 1024) * 30; // in seconds
        let progress = 0;
        let elapsed = 0;

        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.style.backgroundColor = ''; 
        progressText.textContent = 'جاري التحضير... 0%';
        timeEstimate.textContent = `الوقت المتبقي: ~${Math.round(estimatedDuration)} ثانية`;

        progressInterval = setInterval(() => {
            elapsed++;
            progress = Math.min(95, (elapsed / estimatedDuration) * 100);
            
            progressBar.style.width = `${progress.toFixed(2)}%`;
            progressText.textContent = `جاري الترجمة... ${Math.round(progress)}%`;

            const remaining = Math.round(estimatedDuration - elapsed);
            if (remaining > 0) {
                timeEstimate.textContent = `الوقت المتبقي: ~${remaining} ثانية`;
            } else {
                timeEstimate.textContent = 'اللمسات الأخيرة...';
            }

            if (progress >= 95) {
                clearInterval(progressInterval);
            }
        }, 1000);
    }

    function completeProgress() {
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        progressText.textContent = 'اكتملت الترجمة بنجاح! 100%';
        timeEstimate.textContent = 'تم! بدأ التحميل.';
    }
    
    function failProgress(errorMessage) {
        clearInterval(progressInterval);
        progressBar.style.backgroundColor = '#d93025'; 
        progressText.textContent = `فشل: ${errorMessage}`;
        timeEstimate.textContent = 'يرجى المحاولة مرة أخرى.';
    }
    
    function resetFileUI() {
        fileInput.value = ''; 
        fileNameDisplay.querySelector('.en b').textContent = 'Click to upload';
        fileNameDisplay.querySelector('.ar b').textContent = 'انقر للرفع';
        dynamicUploadIcon.src = fileIcons.default;
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 5000);
    }

    async function handleFileSubmit(e) {
        e.preventDefault();
        if (fileInput.files.length === 0) {
            alert('Please select a file first. / الرجاء اختيار ملف أولاً.');
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData(fileForm);
        translateFileBtn.disabled = true;

        startProgressSimulation(file.size);

        try {
            const response = await fetch(FILE_TRANSLATE_URL, { method: 'POST', body: formData });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            completeProgress();

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'translated_document.docx';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch && filenameMatch.length > 1) filename = filenameMatch[1];
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();

        } catch (error) {
            console.error('File Translation Error:', error);
            failProgress(error.message);
        } finally {
            translateFileBtn.disabled = false;
            resetFileUI();
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
        }
    }

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileNameDisplay.querySelector('.en b').textContent = file.name;
            fileNameDisplay.querySelector('.ar b').textContent = '';
            progressContainer.style.display = 'none';

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
    uploadArea.addEventListener('drop', e => { fileInput.files = e.dataTransfer.files; fileInput.dispatchEvent(new Event('change')); });

    fileForm.addEventListener('submit', handleFileSubmit);
    
    let debounceTimer;
    sourceTextArea.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => handleTextTranslation(false), 800); });
    autoDetectBtn.addEventListener('click', () => handleTextTranslation(true));
    copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(targetTextArea.value).then(() => { copyBtn.title = 'Copied!'; setTimeout(() => { copyBtn.title = 'Copy text'; }, 2000); }); });

    populateLanguageSelectors();
});

function openTab(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(tl => tl.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
}
