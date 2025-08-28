document.addEventListener('DOMContentLoaded', () => {
    // --- URLs and Elements ---
    const BASE_URL = 'https://translation-929510129831.europe-west1.run.app'; // استخدم الرابط الأساسي هنا
    const FILE_TRANSLATE_URL = `${BASE_URL}/translate-file`;
    const TEXT_TRANSLATE_URL = `${BASE_URL}/translate-text`;

    const fileForm = document.getElementById('file-upload-form');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const fileSourceLang = document.getElementById('file-source-lang');
    const fileTargetLang = document.getElementById('file-target-lang');

    const sourceTextArea = document.getElementById('source-text');
    const targetTextArea = document.getElementById('target-text');
    const textSourceLang = document.getElementById('text-source-lang');
    const textTargetLang = document.getElementById('text-target-lang');
    const translateTextBtn = document.getElementById('translate-text-btn');

    const statusContainer = document.getElementById('status-container');
    const statusText = document.getElementById('status-text');
    const resultContainer = document.getElementById('result-container');
    const finalResultText = document.getElementById('final-result-text');
    const copyBtn = document.getElementById('copy-btn');

    // --- Language List ---
    const languages = {
        'Arabic': 'ar', 'English': 'en', 'Spanish': 'es', 'French': 'fr', 'German': 'de',
        'Italian': 'it', 'Japanese': 'ja', 'Korean': 'ko', 'Chinese (Simplified)': 'zh-CN',
        'Russian': 'ru', 'Portuguese': 'pt', 'Hindi': 'hi', 'Turkish': 'tr', 'Dutch': 'nl'
    };
    
    // --- Functions ---
    function populateLanguageSelectors() {
        const selectors = [fileSourceLang, fileTargetLang, textSourceLang, textTargetLang];
        selectors.forEach(selector => {
            // Add auto-detect for source languages
            if (selector.id.includes('source')) {
                 selector.innerHTML = '<option value="auto">Auto-Detect / كشف تلقائي</option>';
            } else {
                 selector.innerHTML = '';
            }

            for (const [name, code] of Object.entries(languages)) {
                const option = document.createElement('option');
                option.value = name; // Send full name to backend
                option.textContent = name;
                selector.appendChild(option);
            }
        });
        // Set default target language
        fileTargetLang.value = 'Arabic';
        textTargetLang.value = 'Arabic';
    }

    function showStatus(message) {
        resultContainer.style.display = 'none';
        statusContainer.style.display = 'block';
        statusText.textContent = message;
    }

    function showResult(text) {
        statusContainer.style.display = 'none';
        resultContainer.style.display = 'block';
        finalResultText.value = text;
    }

    function showError(message) {
        statusContainer.style.display = 'block';
        resultContainer.style.display = 'none';
        statusText.innerHTML = `<span style="color: #e15423;">Error / خطأ: ${message}</span>`;
    }
    
    // --- Event Listeners ---
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = fileInput.files[0].name;
        }
    });

    fileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (fileInput.files.length === 0) {
            alert('Please select a file first. / الرجاء اختيار ملف أولاً.');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('source_lang', fileSourceLang.value);
        formData.append('target_lang', fileTargetLang.value);

        showStatus('Uploading and translating file... / جاري رفع وترجمة الملف...');

        try {
            const response = await fetch(FILE_TRANSLATE_URL, { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Unknown server error.');
            showResult(data.translated_text);
        } catch (error) {
            console.error('File Translation Error:', error);
            showError(error.message);
        }
    });

    async function handleTextTranslation() {
        const text = sourceTextArea.value.trim();
        if (!text) return;

        targetTextArea.value = "Translating... / جاري الترجمة...";

        try {
            const response = await fetch(TEXT_TRANSLATE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    source_lang: textSourceLang.value,
                    target_lang: textTargetLang.value
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Unknown server error.');
            targetTextArea.value = data.translated_text;
        } catch (error) {
            console.error('Text Translation Error:', error);
            targetTextArea.value = `Error: ${error.message}`;
        }
    }
    
    translateTextBtn.addEventListener('click', handleTextTranslation);
    
    // Debounce for live translation
    let debounceTimer;
    sourceTextArea.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            handleTextTranslation();
        }, 1000); // 1 second delay
    });

    copyBtn.addEventListener('click', () => {
        finalResultText.select();
        document.execCommand('copy');
        alert('Translation copied to clipboard! / تم نسخ الترجمة!');
    });

    // --- Initialization ---
    populateLanguageSelectors();
});

// --- Tab Switching Logic ---
function openTab(evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
        tabcontent[i].classList.remove("active");
    }
    tablinks = document.getElementsByClassName("tab-link");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).style.display = "block";
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
}
