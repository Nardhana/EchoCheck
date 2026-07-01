document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration ---
    // IMPORTANT: Replace with your own Firebase project configuration
    const firebaseConfig = {
  apiKey: "AIzaSyA1MLXpyxJ9Hnhzdo0EE-7RnhxTj58hYCk",
  authDomain: "echocheck-ea0b2.firebaseapp.com",
  databaseURL: "https://echocheck-ea0b2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "echocheck-ea0b2",
  storageBucket: "echocheck-ea0b2.firebasestorage.app",
  messagingSenderId: "556400987286",
  appId: "1:556400987286:web:7d646a651ea7af13c046b7",
  measurementId: "G-TZ8Z1GS8CN"
};

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- App Initialization ---
    const authScreen = document.getElementById('auth-screen');
    const chatUI = document.getElementById('chat-ui');
    const showLoginBtn = document.getElementById('show-login-btn');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container');
    const historyList = document.getElementById('history-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInitial = document.getElementById('user-initial');
    const userEmail = document.getElementById('user-email');

    const BACKEND_URL = 'http://127.0.0.1:5000/analyze';
    const IMAGE_ANALYZE_URL = 'http://127.0.0.1:5000/analyze-image';
    const DOC_ANALYZE_URL = 'http://127.0.0.1:5000/analyze-document';
    let currentChatId = null;
    let historyUnsubscribe = null;
    let attachedFile = null; // { file: File, type: 'image' | 'document' }

    // --- Authentication State Observer ---
    auth.onAuthStateChanged(user => {
        if (user) {
            authScreen.classList.add('hidden');
            chatUI.classList.remove('hidden');
            userEmail.textContent = user.email;
            userInitial.textContent = user.email.charAt(0).toUpperCase();
            loadUserHistory(user.uid);
        } else {
            authScreen.classList.remove('hidden');
            chatUI.classList.add('hidden');
            historyList.innerHTML = '';
            chatContainer.innerHTML = '';
            if (historyUnsubscribe) {
                historyUnsubscribe();
            }
        }
    });

    // --- Authentication Flow ---
    function showModal(modal) { 
        modal.classList.remove('hidden');
        void modal.offsetWidth; 
        modal.querySelector('.modal-content').style.transform = 'scale(1)';
        modal.querySelector('.modal-content').style.opacity = '1';
    }

    function hideModal(modal) { 
        modal.querySelector('.modal-content').style.transform = 'scale(0.95)';
        modal.querySelector('.modal-content').style.opacity = '0';
        setTimeout(() => {
            modal.classList.add('hidden');
            const errorEl = modal.querySelector('[id$="-error"]');
            if (errorEl) {
                errorEl.classList.add('hidden');
                errorEl.textContent = '';
            }
        }, 300);
    }

    showLoginBtn.addEventListener('click', () => showModal(loginModal));
    showSignupBtn.addEventListener('click', () => showModal(signupModal));
    
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            hideModal(e.target.closest('.modal-backdrop'));
        });
    });

    signupBtn.addEventListener('click', () => {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const errorEl = document.getElementById('signup-error');

        if (password !== confirmPassword) {
            errorEl.textContent = "Passwords do not match.";
            errorEl.classList.remove('hidden');
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then(() => hideModal(signupModal))
            .catch(error => {
                errorEl.textContent = error.message;
                errorEl.classList.remove('hidden');
            });
    });

    loginBtn.addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        auth.signInWithEmailAndPassword(email, password)
            .then(() => hideModal(loginModal))
            .catch(error => {
                errorEl.textContent = error.message;
                errorEl.classList.remove('hidden');
            });
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    // --- File Attachment Logic ---
    const attachBtn = document.getElementById('attach-btn');
    const fileInput = document.getElementById('file-input');
    const filePreviewArea = document.getElementById('file-preview-area');
    const filePreviewIcon = document.getElementById('file-preview-icon');
    const filePreviewName = document.getElementById('file-preview-name');
    const filePreviewSize = document.getElementById('file-preview-size');
    const removeFileBtn = document.getElementById('remove-file-btn');

    const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const DOC_EXTENSIONS = ['pdf', 'docx', 'txt'];

    attachBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        const isImage = IMAGE_TYPES.includes(file.type);
        const isDoc = DOC_EXTENSIONS.includes(ext);
        if (!isImage && !isDoc) {
            alert('Unsupported file type. Please attach a JPEG, PNG, WebP, PDF, DOCX, or TXT file.');
            fileInput.value = '';
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('File is too large. Maximum size is 20 MB.');
            fileInput.value = '';
            return;
        }
        attachedFile = { file, type: isImage ? 'image' : 'document' };
        filePreviewName.textContent = file.name;
        filePreviewSize.textContent = `${(file.size / 1024).toFixed(1)} KB · ${isImage ? 'Image' : 'Document'}`;
        filePreviewIcon.innerHTML = isImage
            ? `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`
            : `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`;
        filePreviewArea.classList.remove('hidden');
        fileInput.value = '';
    });

    removeFileBtn.addEventListener('click', () => {
        attachedFile = null;
        filePreviewArea.classList.add('hidden');
    });

    // --- Chat Logic ---
    async function handleSendMessage() {
        const statement = chatInput.value.trim();
        if (!statement && !attachedFile) return;

        const user = auth.currentUser;
        if (!user) return;

        if (!currentChatId) chatContainer.innerHTML = '';

        // Hide welcome state on first message
        const welcomeState = document.getElementById('welcome-state');
        if (welcomeState) welcomeState.remove();

        // Build user bubble label
        const fileLabel = attachedFile ? ` [${attachedFile.type === 'image' ? '📎 Image' : '📄 Document'}: ${attachedFile.file.name}]` : '';
        displayUserMessage((statement || '(no caption)') + fileLabel);
        chatInput.value = '';

        const sentFile = attachedFile;
        attachedFile = null;
        filePreviewArea.classList.add('hidden');

        displayTypingIndicator();

        let result = null;
        let analysisMode = 'text';

        try {
            if (sentFile && sentFile.type === 'image') {
                analysisMode = 'image';
                const formData = new FormData();
                formData.append('image', sentFile.file);
                if (statement) formData.append('statement', statement);
                const response = await fetch(IMAGE_ANALYZE_URL, { method: 'POST', body: formData });
                if (!response.ok) throw new Error(response.statusText);
                result = await response.json();

            } else if (sentFile && sentFile.type === 'document') {
                analysisMode = 'document';
                const formData = new FormData();
                formData.append('document', sentFile.file);
                const response = await fetch(DOC_ANALYZE_URL, { method: 'POST', body: formData });
                if (!response.ok) throw new Error(response.statusText);
                result = await response.json();

            } else {
                const response = await fetch(BACKEND_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ statement })
                });
                if (!response.ok) throw new Error(response.statusText);
                result = await response.json();
            }

            removeTypingIndicator();
            if (analysisMode === 'image') {
                displayImageAnalysisResult(result, sentFile.file.name, statement);
            } else {
                displayAIMessage(result, statement || sentFile.file.name);
            }

        } catch (error) {
            console.error('Error during analysis:', error);
            removeTypingIndicator();
            displayAIMessage({ verdict: 'Connection Error', reasoning: 'Could not connect to the analysis server. Please ensure the Python backend is running.', evidence: [] }, statement || '');
        }

        if (result) {
            try {
                const newChatRef = db.collection('users').doc(user.uid).collection('chats').doc();
                currentChatId = newChatRef.id;
                await newChatRef.set({
                    statement: statement || (sentFile ? sentFile.file.name : ''),
                    result,
                    mode: analysisMode,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (firestoreError) {
                console.error('Firestore save error:', firestoreError);
                saveToLocalHistory(user.uid, statement || (sentFile ? sentFile.file.name : ''), result);
            }
        }
    }

    sendBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });

    // Demo claim chips — click to auto-fill and submit
    document.querySelectorAll('.demo-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chatInput.value = chip.textContent.trim();
            handleSendMessage();
        });
    });
    
    newChatBtn.addEventListener('click', () => {
        chatContainer.innerHTML = `
            <div id="welcome-state" class="flex flex-col items-center justify-center h-full text-center px-4">
                <p class="text-slate-500 text-lg font-medium mb-5">Ask a question, or try one of these examples:</p>
                <div class="flex flex-wrap justify-center gap-2 max-w-lg">
                    <button class="demo-chip px-4 py-2 rounded-full bg-white border border-gray-300 text-sm text-slate-700 hover:border-indigo-400 hover:text-indigo-700 transition shadow-sm">The COVID-19 vaccine contains microchips</button>
                    <button class="demo-chip px-4 py-2 rounded-full bg-white border border-gray-300 text-sm text-slate-700 hover:border-indigo-400 hover:text-indigo-700 transition shadow-sm">NASA confirmed water on Mars</button>
                    <button class="demo-chip px-4 py-2 rounded-full bg-white border border-gray-300 text-sm text-slate-700 hover:border-indigo-400 hover:text-indigo-700 transition shadow-sm">The Earth is flat</button>
                    <button class="demo-chip px-4 py-2 rounded-full bg-white border border-gray-300 text-sm text-slate-700 hover:border-indigo-400 hover:text-indigo-700 transition shadow-sm">Climate change is a hoax invented by China</button>
                    <button class="demo-chip px-4 py-2 rounded-full bg-white border border-gray-300 text-sm text-slate-700 hover:border-indigo-400 hover:text-indigo-700 transition shadow-sm">5G towers cause cancer</button>
                </div>
            </div>`;
        // Re-bind demo chips on new chat
        chatContainer.querySelectorAll('.demo-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                chatInput.value = chip.textContent.trim();
                handleSendMessage();
            });
        });
        currentChatId = null;
        document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
        chatInput.focus();
    });

    // --- History Display Logic ---
    async function deleteHistoryItem(chatId) {
        const user = auth.currentUser;
        if (!user) return;
        
        // If it's a local-only entry, just remove from localStorage
        if (chatId.startsWith('local_')) {
            deleteFromLocalHistory(user.uid, chatId);
            loadLocalHistory(user.uid);
            if (currentChatId === chatId) {
                newChatBtn.click();
            }
            return;
        }
        
        try {
            await db.collection('users').doc(user.uid).collection('chats').doc(chatId).delete();
            if (currentChatId === chatId) {
                newChatBtn.click();
            }
        } catch (error) {
            console.error("Error deleting history item:", error);
            deleteFromLocalHistory(user.uid, chatId);
            if (currentChatId === chatId) {
                newChatBtn.click();
            }
        }
    }

    // --- localStorage Fallback for History ---
    function getLocalHistoryKey(userId) {
        return `echocheck_history_${userId}`;
    }

    function saveToLocalHistory(userId, statement, result) {
        const key = getLocalHistoryKey(userId);
        const history = JSON.parse(localStorage.getItem(key) || '[]');
        const id = 'local_' + Date.now();
        history.unshift({ id, statement, result, timestamp: { seconds: Date.now() / 1000 } });
        localStorage.setItem(key, JSON.stringify(history));
        currentChatId = id;
        // Refresh the history list
        loadLocalHistory(userId);
    }

    function deleteFromLocalHistory(userId, chatId) {
        const key = getLocalHistoryKey(userId);
        let history = JSON.parse(localStorage.getItem(key) || '[]');
        history = history.filter(h => h.id !== chatId);
        localStorage.setItem(key, JSON.stringify(history));
    }

    function loadLocalHistory(userId) {
        const key = getLocalHistoryKey(userId);
        const history = JSON.parse(localStorage.getItem(key) || '[]');
        updateHistoryList(history);
    }

    function loadUserHistory(userId) {
        const chatsRef = db.collection('users').doc(userId).collection('chats').orderBy('timestamp', 'desc');
        
        historyUnsubscribe = chatsRef.onSnapshot(snapshot => {
            const firestoreHistory = [];
            snapshot.forEach(doc => {
                firestoreHistory.push({ id: doc.id, ...doc.data() });
            });
            // Merge with localStorage history
            const localHistory = JSON.parse(localStorage.getItem(getLocalHistoryKey(userId)) || '[]');
            const allHistory = [...firestoreHistory, ...localHistory];
            updateHistoryList(allHistory);
        }, error => {
            console.error("Error loading history from Firestore, using localStorage only:", error);
            loadLocalHistory(userId);
        });
    }

    function updateHistoryList(history) {
        historyList.innerHTML = '';
        history.forEach(conv => {
            const div = createDOMElement('div', 'p-3 cursor-pointer history-item rounded-md text-gray-700 text-sm flex items-center justify-between space-x-3');
            div.dataset.chatId = conv.id;

            const contentWrapper = createDOMElement('div', 'flex items-center space-x-2 overflow-hidden flex-grow');
            const statementSpan = createDOMElement('span', 'truncate', conv.statement);
            const verdictIconContainer = createDOMElement('div', 'flex-shrink-0');
            verdictIconContainer.innerHTML = getVerdictUI(conv.result.verdict, 'w-5 h-5').icon;
            
            contentWrapper.appendChild(verdictIconContainer);
            contentWrapper.appendChild(statementSpan);
            
            const deleteBtn = createDOMElement('button', 'delete-history-btn p-1 rounded-full hover:bg-red-100');
            deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500 hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteHistoryItem(conv.id);
            });

            div.addEventListener('click', () => {
                displayConversation(conv);
                document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
                div.classList.add('active');
            });

            div.appendChild(contentWrapper);
            div.appendChild(deleteBtn);
            historyList.appendChild(div);
        });
    }
    
    function displayConversation(conv) {
        if (!conv) return;
        chatContainer.innerHTML = '';
        currentChatId = conv.id;
        displayUserMessage(conv.statement);
        setTimeout(() => displayAIMessage(conv.result, conv.statement), 100);
    }

    // --- UI Element Creation Functions ---
    function createDOMElement(tag, classNames, content = '') {
        const el = document.createElement(tag);
        if (classNames) el.className = classNames;
        if (content) el.innerHTML = content;
        return el;
    }

    function displayUserMessage(text) {
        const wrapper = createDOMElement('div', 'mb-4 flex justify-end chat-bubble');
        const bubble = createDOMElement('div', 'chat-bubble-user p-4 rounded-xl max-w-xl shadow-md');
        bubble.textContent = text;
        wrapper.appendChild(bubble);
        chatContainer.appendChild(wrapper);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function displayTypingIndicator() {
        const indicator = createDOMElement('div', 'mb-4 flex', '');
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="analyst-card p-6 w-full max-w-3xl mx-auto">
                <div class="flex items-center justify-center space-x-2 loader-dots">
                    <div class="w-3 h-3 rounded-full"></div>
                    <div class="w-3 h-3 rounded-full"></div>
                    <div class="w-3 h-3 rounded-full"></div>
                </div>
                <p class="text-slate-600 text-center text-lg font-medium mt-4">EchoCheck is analyzing...</p>
            </div>`;
        chatContainer.appendChild(indicator);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    function displayAIMessage(result, statement) {
        const wrapper = createDOMElement('div', 'mb-4 w-full');
        
        const statementCard = createDOMElement('div', 'analyst-card p-6 mb-8 ui-element-in');
        statementCard.innerHTML = `
            <p class="text-slate-600 text-sm font-medium">${result.mode === 'document' ? 'Document Analyzed:' : 'Statement Analyzed:'}</p>
            <p class="text-slate-800 font-semibold text-xl">${statement}</p>
            ${result.extracted_preview ? `<details class="mt-3"><summary class="text-xs text-indigo-600 cursor-pointer font-medium">Show extracted text preview</summary><p class="mt-2 text-xs text-slate-500 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">${result.extracted_preview}</p></details>` : ''}
        `;
        wrapper.appendChild(statementCard);

        const grid = createDOMElement('div', 'grid grid-cols-1 lg:grid-cols-3 gap-8');
        
        // Verdict Card
        const verdictUI = getVerdictUI(result.verdict);
        const confidence = result.confidence != null ? result.confidence : null;
        const fallbackBadge = result.fallback_used
            ? `<div class="mt-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">⚠ AI unavailable — local heuristic analysis used. Results may be less accurate.</div>`
            : '';
        const confidenceBar = confidence != null ? `
            <div class="mt-4 w-full">
                <div class="flex justify-between text-xs text-slate-500 mb-1"><span>Confidence</span><span class="font-bold text-slate-700">${confidence}%</span></div>
                <div class="w-full bg-gray-200 rounded-full h-2"><div class="h-2 rounded-full transition-all" style="width:${confidence}%; background:${confidence >= 70 ? '#10b981' : confidence >= 40 ? '#f59e0b' : '#ef4444'}"></div></div>
            </div>` : '';
        const verdictCard = createDOMElement('div', 'analyst-card p-6 lg:col-span-1 ui-element-in');
        verdictCard.style.animationDelay = '0.1s';
        verdictCard.innerHTML = `
            <h2 class="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-3">Verdict</h2>
            <div class="text-center py-4 flex flex-col items-center justify-center">
                <div class="mb-4">${verdictUI.icon}</div>
                <p class="text-3xl font-bold ${verdictUI.textColor}">${result.verdict}</p>
                <p class="text-slate-500 mt-2 text-md">${result.reasoning}</p>
                ${fallbackBadge}
                ${confidenceBar}
            </div>
        `;
        grid.appendChild(verdictCard);

        // Evidence Card
        const evidenceCard = createDOMElement('div', 'analyst-card p-6 lg:col-span-2 ui-element-in');
        evidenceCard.style.animationDelay = '0.2s';
        let evidenceHTML = result.evidence && result.evidence.length > 0 ? 
            result.evidence.map(item => {
                const cred = item.credibility || 'Unknown';
                const credStyle = cred === 'High' ? 'bg-green-100 text-green-700' :
                                  cred === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                  cred === 'Low' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500';
                const biasStyle = (item.bias || '').includes('Left') ? 'bg-blue-100 text-blue-700' :
                                  (item.bias || '').includes('Right') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';
                return `
                <a href="${item.url || '#'}" target="_blank" rel="noopener noreferrer" class="block border-l-4 border-slate-200 pl-4 transition-all duration-300 evidence-snippet hover:border-indigo-400">
                    <p class="font-semibold text-slate-800">${item.title}</p>
                    <div class="flex flex-wrap items-center gap-1.5 mt-1 mb-1.5">
                        <span class="text-xs text-indigo-600 font-medium">${item.source}</span>
                        <span class="px-1.5 py-0.5 rounded text-xs font-semibold ${credStyle}">${cred} Credibility</span>
                        <span class="px-1.5 py-0.5 rounded text-xs font-semibold ${biasStyle}">${item.bias || 'Center'}</span>
                    </div>
                    <p class="text-sm text-slate-600">${item.snippet || ''}</p>
                </a>`;
            }).join('') : 
            '<p class="text-slate-500">No direct evidence was found.</p>';
        
        evidenceCard.innerHTML = `
            <h2 class="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-3">Supporting Evidence</h2>
            <div class="space-y-4 text-slate-700 max-h-[400px] overflow-y-auto pr-2">${evidenceHTML}</div>
        `;
        grid.appendChild(evidenceCard);
        wrapper.appendChild(grid);

        // Bias Card
        if (result.evidence && result.evidence.length > 0) {
            const biasCard = createDOMElement('div', 'analyst-card p-6 mt-8 ui-element-in');
            biasCard.style.animationDelay = '0.3s';
            const canvasId = `chart-${currentChatId || 'temp'}`;
            biasCard.innerHTML = `
                <h2 class="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-3">Source Bias Analysis</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div class="relative h-48 md:h-64"><canvas id="${canvasId}"></canvas></div>
                    <div class="space-y-3 text-sm">
                        <div class="flex items-start space-x-2">
                            <span class="inline-block w-3 h-3 mt-1 rounded-full flex-shrink-0" style="background:#3B82F6"></span>
                            <div><span class="font-semibold text-slate-700">Left-leaning</span><p class="text-slate-500">Sources that tend to favor progressive or liberal perspectives, often emphasizing social justice, government intervention, and civil liberties.</p></div>
                        </div>
                        <div class="flex items-start space-x-2">
                            <span class="inline-block w-3 h-3 mt-1 rounded-full flex-shrink-0" style="background:#6B7280"></span>
                            <div><span class="font-semibold text-slate-700">Center</span><p class="text-slate-500">Sources that aim for balanced, neutral reporting with minimal ideological slant, presenting multiple viewpoints on issues.</p></div>
                        </div>
                        <div class="flex items-start space-x-2">
                            <span class="inline-block w-3 h-3 mt-1 rounded-full flex-shrink-0" style="background:#EF4444"></span>
                            <div><span class="font-semibold text-slate-700">Right-leaning</span><p class="text-slate-500">Sources that tend to favor conservative perspectives, often emphasizing free markets, limited government, and traditional values.</p></div>
                        </div>
                    </div>
                </div>
            `;
            wrapper.appendChild(biasCard);
            setTimeout(() => renderBiasChart(result.evidence, canvasId), 0);
        }

        chatContainer.appendChild(wrapper);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function displayImageAnalysisResult(result, filename, statement) {
        const wrapper = createDOMElement('div', 'mb-4 w-full');

        // Header card
        const headerCard = createDOMElement('div', 'analyst-card p-6 mb-8 ui-element-in');
        headerCard.innerHTML = `
            <p class="text-slate-600 text-sm font-medium">Image Analyzed:</p>
            <p class="text-slate-800 font-semibold text-xl">${filename}</p>
            ${statement ? `<p class="text-slate-500 text-sm mt-1">Claim: "${statement}"</p>` : ''}
        `;
        wrapper.appendChild(headerCard);

        const grid = createDOMElement('div', 'grid grid-cols-1 lg:grid-cols-3 gap-8');

        // Verdict + manipulation meter
        const score = result.manipulation_score >= 0 ? result.manipulation_score : null;
        const scoreColor = score == null ? '#6B7280' : score >= 70 ? '#ef4444' : score >= 35 ? '#f59e0b' : '#10b981';
        const scoreLabel = score == null ? 'N/A' : score >= 70 ? 'High Risk' : score >= 35 ? 'Suspicious' : 'Likely Authentic';
        const confidence = result.confidence != null ? result.confidence : null;

        const verdictIconMap = {
            'Authentic': `<svg class="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
            'Likely Manipulated': `<svg class="h-16 w-16 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
            'AI Generated': `<svg class="h-16 w-16 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-2"/></svg>`,
            'Deepfake Suspected': `<svg class="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
        };
        const verdictIcon = verdictIconMap[result.verdict] || verdictIconMap['Likely Manipulated'];
        const verdictTextColors = { 'Authentic': 'text-green-600', 'Likely Manipulated': 'text-amber-600', 'AI Generated': 'text-purple-600', 'Deepfake Suspected': 'text-red-600' };
        const verdictTextColor = verdictTextColors[result.verdict] || 'text-slate-700';

        const verdictCard = createDOMElement('div', 'analyst-card p-6 lg:col-span-1 ui-element-in');
        verdictCard.style.animationDelay = '0.1s';
        verdictCard.innerHTML = `
            <h2 class="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-3">Authenticity Verdict</h2>
            <div class="text-center py-4 flex flex-col items-center">
                <div class="mb-3">${verdictIcon}</div>
                <p class="text-2xl font-bold ${verdictTextColor}">${result.verdict || 'Inconclusive'}</p>
                <p class="text-slate-500 mt-2 text-sm">${result.reasoning}</p>
                ${score != null ? `
                <div class="mt-5 w-full">
                    <div class="flex justify-between text-xs text-slate-500 mb-1"><span>Manipulation Risk</span><span class="font-bold" style="color:${scoreColor}">${score}% · ${scoreLabel}</span></div>
                    <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden"><div class="h-3 rounded-full transition-all" style="width:${score}%; background:${scoreColor}"></div></div>
                </div>` : ''}
                ${confidence != null ? `
                <div class="mt-3 w-full">
                    <div class="flex justify-between text-xs text-slate-500 mb-1"><span>Analysis Confidence</span><span class="font-bold text-slate-700">${confidence}%</span></div>
                    <div class="w-full bg-gray-200 rounded-full h-2"><div class="h-2 rounded-full bg-indigo-500 transition-all" style="width:${confidence}%"></div></div>
                </div>` : ''}
            </div>
        `;
        grid.appendChild(verdictCard);

        // Indicators + claim match card
        const detailCard = createDOMElement('div', 'analyst-card p-6 lg:col-span-2 ui-element-in');
        detailCard.style.animationDelay = '0.2s';
        const indicatorsHTML = result.indicators && result.indicators.length > 0
            ? result.indicators.map(ind => `<li class="flex items-start gap-2 text-sm text-slate-700"><svg class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>${ind}</li>`).join('')
            : '<li class="text-sm text-green-600">No manipulation indicators detected.</li>';
        const claimMatchColors = { 'Supports': 'bg-green-100 text-green-700', 'Contradicts': 'bg-red-100 text-red-700', 'Unrelated': 'bg-gray-100 text-gray-700', 'Cannot Determine': 'bg-amber-100 text-amber-700' };
        const claimMatchHTML = result.claim_match
            ? `<div class="mt-6 pt-4 border-t border-slate-200"><p class="text-sm font-semibold text-slate-700 mb-2">Claim vs. Image:</p><span class="px-3 py-1 rounded-full text-sm font-bold ${claimMatchColors[result.claim_match] || 'bg-gray-100 text-gray-700'}">${result.claim_match}</span></div>`
            : '';
        detailCard.innerHTML = `
            <h2 class="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-3">Forensic Indicators</h2>
            <ul class="space-y-3">${indicatorsHTML}</ul>
            ${claimMatchHTML}
        `;
        grid.appendChild(detailCard);
        wrapper.appendChild(grid);

        chatContainer.appendChild(wrapper);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    let charts = {};
    function renderBiasChart(evidence, canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const biasCounts = { 'Left-leaning': 0, 'Center': 0, 'Right-leaning': 0 };
        evidence.forEach(item => { if (item.bias in biasCounts) biasCounts[item.bias]++; });
        
        if (charts[canvasId]) charts[canvasId].destroy();

        charts[canvasId] = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(biasCounts),
                datasets: [{
                    data: Object.values(biasCounts),
                    backgroundColor: ['#3B82F6', '#6B7280', '#EF4444'],
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                    borderWidth: 4,
                    hoverOffset: 8
                }]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: { 
                        displayColors: false,
                        backgroundColor: '#1e293b',
                        titleFont: { size: 16 },
                        bodyFont: { size: 14, weight: 'bold' }
                    }
                } 
            }
        });
    }

    function getVerdictUI(verdict, size = 'h-16 w-16') {
        const iconBaseClass = `${size}`;
        switch (verdict) {
            case "Confirmed": return { icon: `<svg class="${iconBaseClass} text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`, textColor: 'text-green-600' };
            case "Debunked": return { icon: `<svg class="${iconBaseClass} text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`, textColor: 'text-red-600' };
            case "Fundamentally False": return { icon: `<svg class="${iconBaseClass} text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>`, textColor: 'text-slate-700' };
            default: return { icon: `<svg class="${iconBaseClass} text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`, textColor: 'text-amber-600' };
        }
    }
});
