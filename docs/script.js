// --- INICIALIZAÇÃO GLOBAL ---
function onYouTubeIframeAPIReady() {
    window.YT_API_READY = true;
    document.dispatchEvent(new Event('ytApiReady'));
}

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const favicon = document.getElementById('favicon');
    const timerDisplay = document.getElementById('timer-display');
    const startPauseBtn = document.getElementById('start-pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const shareBtn = document.getElementById('share-btn');
    const progressRing = document.getElementById('progress-ring');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskListEl = document.getElementById('task-list');
    const currentTaskDisplay = document.getElementById('current-task-display');
    const pomodoroCyclesEl = document.getElementById('pomodoro-cycles');
    const alertModalOverlay = document.getElementById('alert-modal-overlay');
    const alertModalCloseBtn = document.getElementById('alert-modal-close-btn');
    const settingsModalOverlay = document.getElementById('settings-modal-overlay');
    const settingsSaveBtn = document.getElementById('settings-save-btn');
    const focusDurationInput = document.getElementById('focus-duration');
    const shortBreakDurationInput = document.getElementById('short-break-duration');
    const longBreakDurationInput = document.getElementById('long-break-duration');
    const longBreakIntervalInput = document.getElementById('long-break-interval');
    const volumeSlider = document.getElementById('volume-slider');
    const musicStatus = document.getElementById('music-status');
    const enableNotificationsBtn = document.getElementById('enable-notifications-btn');
    const notificationsStatusMsg = document.getElementById('notifications-status-msg');
    const youtubeSearchInput = document.getElementById('youtube-search-input');
    const youtubeSearchBtn = document.getElementById('youtube-search-btn');
    const youtubeApiKeyInput = document.getElementById('youtube-api-key');
    const searchResultsModalOverlay = document.getElementById('search-results-modal-overlay');
    const searchResultsList = document.getElementById('search-results-list');
    const searchResultsCloseBtn = document.getElementById('search-results-close-btn');
    const apiKeyPromptMsg = document.getElementById('api-key-prompt-msg');
    const youtubeLinkInput = document.getElementById('youtube-link-input');
    const playLinkBtn = document.getElementById('play-link-btn');
    const musicPlayerContainer = document.getElementById('music-player-container');
    // Novos elementos para animação
    const canvas = document.getElementById('sound-wave-canvas');
    const canvasCtx = canvas.getContext('2d');


    // --- ESTADO DA APLICAÇÃO ---
    let timer, isRunning = false, mode = 'focus', timeRemaining, totalTime;
    let tasks = [], selectedTaskId = null, pomodorosCompleted = 0;
    let settings = { focusDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, longBreakInterval: 4 };
    let youtubeApiKey = '';

    // --- ESTADO DO PLAYER DE MÚSICA E ANIMAÇÕES ---
    let ytPlayer, isPlayerReady = false;
    let visualizerAnimationId;

    // --- FUNÇÕES DE ANIMAÇÃO ---

    /**
     * Inicia o visualizador de ondas sonoras com barras arredondadas.
     */
    function startVisualizer() {
        if (visualizerAnimationId) cancelAnimationFrame(visualizerAnimationId);

        let barCount = 20; // Aumentado para mais detalhe
        let bars = [];
        for (let i = 0; i < barCount; i++) {
            // Altura inicial aleatória para um início mais natural
            bars.push({ height: Math.random() * 20 + 5, speed: Math.random() * 0.8 + 0.2, direction: 1 });
        }

        const draw = () => {
            visualizerAnimationId = requestAnimationFrame(draw);
            
            const dpr = window.devicePixelRatio || 1;
            const canvasWidth = canvas.offsetWidth;
            const canvasHeight = canvas.offsetHeight;
            canvas.width = canvasWidth * dpr;
            canvas.height = canvasHeight * dpr;
            canvasCtx.scale(dpr, dpr);
            
            canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

            const barWidth = 6; // Largura fixa para as barras
            const gap = (canvasWidth - barCount * barWidth) / (barCount + 1);

            // Gradiente de cores vibrantes
            const gradient = canvasCtx.createLinearGradient(0, 0, canvasWidth, 0);
            gradient.addColorStop(0, '#3B82F6'); // Azul
            gradient.addColorStop(0.5, '#8B5CF6'); // Roxo
            gradient.addColorStop(1, '#EC4899'); // Rosa

            canvasCtx.strokeStyle = gradient;
            canvasCtx.lineWidth = barWidth;
            canvasCtx.lineCap = 'round'; // Essencial para as pontas arredondadas

            bars.forEach((bar, i) => {
                // Movimento mais dinâmico
                bar.height += bar.speed * bar.direction;
                if (bar.height > canvasHeight * 0.9 || bar.height < 5) {
                    bar.direction *= -1;
                    bar.speed = Math.random() * 0.8 + 0.2; // Muda a velocidade a cada inversão
                }
                
                const x = gap + i * (barWidth + gap);
                const y1 = canvasHeight / 2 - bar.height / 2;
                const y2 = canvasHeight / 2 + bar.height / 2;

                canvasCtx.beginPath();
                canvasCtx.moveTo(x, y1);
                canvasCtx.lineTo(x, y2);
                canvasCtx.stroke();
            });
        };
        draw();
    }

    /**
     * Para o visualizador de ondas sonoras.
     */
    function stopVisualizer() {
        if (visualizerAnimationId) {
            cancelAnimationFrame(visualizerAnimationId);
            visualizerAnimationId = null;
            // Limpa o canvas
            setTimeout(() => canvasCtx.clearRect(0, 0, canvas.width, canvas.height), 100);
        }
    }

    /**
     * Verifica se o título da música precisa de deslizar e aplica a classe.
     */
    function updateMarquee() {
        const container = musicStatus.parentElement;
        // Usa um timeout para garantir que o DOM foi atualizado com o novo texto
        setTimeout(() => {
            if (musicStatus.scrollWidth > container.offsetWidth) {
                musicStatus.classList.add('scrolling');
            } else {
                musicStatus.classList.remove('scrolling');
            }
        }, 100);
    }


    // --- FUNÇÕES DE LÓGICA DO YOUTUBE ---
    
    function parseYoutubeUrl(url) {
        const videoIdRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const playlistIdRegex = /[?&]list=([a-zA-Z0-9_-]+)/;
        const videoMatch = url.match(videoIdRegex);
        if (videoMatch && videoMatch[1]) return { type: 'video', id: videoMatch[1] };
        const playlistMatch = url.match(playlistIdRegex);
        if (playlistMatch && playlistMatch[1]) return { type: 'playlist', id: playlistMatch[1] };
        return null;
    }

    function playFromLink() {
        const url = youtubeLinkInput.value.trim();
        if (!url) { showModal(alertModalOverlay, "Por favor, insira um link do YouTube."); return; }
        const content = parseYoutubeUrl(url);
        if (!content) { showModal(alertModalOverlay, "O link inserido não parece ser um vídeo ou playlist válida do YouTube."); return; }
        if (!isPlayerReady) { showModal(alertModalOverlay, "O player de música ainda não está pronto. Tente novamente em alguns segundos."); return; }

        if (content.type === 'video') {
            ytPlayer.loadVideoById(content.id);
            musicStatus.textContent = "A carregar vídeo do link...";
        } else if (content.type === 'playlist') {
            ytPlayer.loadPlaylist({ list: content.id, listType: 'playlist' });
            musicStatus.textContent = "A carregar playlist do link...";
        }
        updateMarquee();
        youtubeLinkInput.value = '';
    }

    async function searchYouTube() {
        const query = youtubeSearchInput.value.trim();
        if (!query) { showModal(alertModalOverlay, "Por favor, digite um termo para buscar."); return; }
        if (!youtubeApiKey) {
            showModal(settingsModalOverlay);
            apiKeyPromptMsg.classList.remove('hidden');
            youtubeApiKeyInput.focus();
            return;
        }

        youtubeSearchBtn.disabled = true;
        youtubeSearchBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
        lucide.createIcons();

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${youtubeApiKey}&type=video,playlist&maxResults=15`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            if (data.items && data.items.length > 0) {
                displaySearchResults(data.items);
            } else {
                showModal(alertModalOverlay, "Nenhum resultado encontrado para sua busca.");
            }
        } catch (error) {
            console.error("Erro ao buscar no YouTube:", error);
            showModal(alertModalOverlay, `Erro ao buscar: ${error.message}. Verifique sua chave da API e a conexão.`);
        } finally {
            youtubeSearchBtn.disabled = false;
            youtubeSearchBtn.innerHTML = '<i data-lucide="search" class="w-5 h-5"></i>';
            lucide.createIcons();
        }
    }

    function displaySearchResults(items) {
        searchResultsList.innerHTML = '';
        items.forEach(item => {
            const isPlaylist = item.id.kind === 'youtube#playlist';
            const id = isPlaylist ? item.id.playlistId : item.id.videoId;
            
            const resultEl = document.createElement('div');
            resultEl.className = 'flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer';
            
            resultEl.innerHTML = `
                <img src="${item.snippet.thumbnails.default.url}" alt="Thumbnail" class="w-16 h-12 object-cover rounded-md mr-3">
                <div class="flex-grow min-w-0">
                    <p class="text-sm font-semibold truncate text-white flex items-center">
                        ${isPlaylist ? '<i data-lucide="list-music" class="w-4 h-4 mr-2 text-blue-400 flex-shrink-0"></i>' : ''}
                        ${item.snippet.title}
                    </p>
                    <p class="text-xs text-gray-400 truncate">${item.snippet.channelTitle}</p>
                </div>
            `;
            resultEl.addEventListener('click', () => {
                if (isPlaylist) {
                    ytPlayer.loadPlaylist({ list: id, listType: 'playlist' });
                    musicStatus.textContent = `A carregar playlist: ${item.snippet.title}`;
                } else {
                    ytPlayer.loadVideoById(id);
                    musicStatus.textContent = `A carregar: ${item.snippet.title}`;
                }
                updateMarquee();
                hideModal(searchResultsModalOverlay);
            });
            searchResultsList.appendChild(resultEl);
        });
        lucide.createIcons();
        showModal(searchResultsModalOverlay);
    }

    // --- FUNÇÕES DO PLAYER DO YOUTUBE ---
    function initializePlayer() {
        ytPlayer = new YT.Player('youtube-player', {
            height: '1', width: '1',
            playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1 },
            events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange, 'onError': onPlayerError }
        });
    }

    function onPlayerReady(event) {
        isPlayerReady = true;
        event.target.setVolume(volumeSlider.value);
    }
    
    function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            musicPlayerContainer.classList.add('music-active');
            startVisualizer();
            // Atualiza o título quando a música realmente começa
            const videoData = ytPlayer.getVideoData();
            musicStatus.textContent = videoData.title || "A tocar...";
            updateMarquee();
        } else {
            musicPlayerContainer.classList.remove('music-active');
            stopVisualizer();
        }
    }

    function onPlayerError(event) {
        console.error('Erro no Player do YouTube:', event.data);
        let errorMessage = `Ocorreu um erro com o player (código: ${event.data}).`;
        if (event.data === 101 || event.data === 150) {
            errorMessage = "O proprietário deste vídeo não permite a sua reprodução aqui. Por favor, tente outro vídeo ou playlist.";
        }
        showModal(alertModalOverlay, errorMessage);
        musicPlayerContainer.classList.remove('music-active');
        stopVisualizer();
    }

    // --- FUNÇÕES PRINCIPAIS DO POMODORO ---
    const showNotification = (title, body) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const task = tasks.find(t => t.id === selectedTaskId);
            const options = { body: body + (task ? `\nTarefa: ${task.name}` : ''), icon: favicon.href };
            new Notification(title, options);
        }
    };

    const updateNotificationStatusUI = () => {
        if (!('Notification' in window)) {
            enableNotificationsBtn.disabled = true;
            notificationsStatusMsg.textContent = 'Navegador não suporta notificações.';
            return;
        }
        switch(Notification.permission) {
            case 'granted':
                enableNotificationsBtn.textContent = 'Ativadas';
                enableNotificationsBtn.disabled = true;
                enableNotificationsBtn.classList.add('bg-green-600', 'cursor-not-allowed');
                notificationsStatusMsg.textContent = 'Você receberá notificações.';
                break;
            case 'denied':
                enableNotificationsBtn.textContent = 'Bloqueadas';
                enableNotificationsBtn.disabled = true;
                enableNotificationsBtn.classList.add('bg-red-600', 'cursor-not-allowed');
                notificationsStatusMsg.textContent = 'Notificações bloqueadas nas configs. do navegador.';
                break;
            default: 
                enableNotificationsBtn.textContent = 'Ativar';
                enableNotificationsBtn.disabled = false;
                enableNotificationsBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                notificationsStatusMsg.textContent = 'Clique para permitir notificações.';
                break;
        }
    };

    const showModal = (modalOverlay, message) => {
        if (message) {
            const messageElement = modalOverlay.querySelector('p') || modalOverlay.querySelector('h2').nextElementSibling;
            if (messageElement) messageElement.textContent = message;
        }
        modalOverlay.classList.add('visible');
    };

    const hideModal = (modalOverlay) => {
        if (apiKeyPromptMsg) apiKeyPromptMsg.classList.add('hidden');
        modalOverlay.classList.remove('visible');
    }

    const startTimer = () => {
        if (isRunning) return;
        if (!selectedTaskId && mode === 'focus') {
            showModal(alertModalOverlay, 'Por favor, selecione uma tarefa para iniciar o foco.');
            return;
        }
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(updateNotificationStatusUI);
        }
        isRunning = true;
        timer = setInterval(updateTimer, 1000);
        if (isPlayerReady && ytPlayer.getPlayerState() !== 1) ytPlayer.playVideo();
        updateUI();
    };

    const pauseTimer = () => {
        if (!isRunning) return;
        isRunning = false;
        clearInterval(timer);
        if (isPlayerReady) ytPlayer.pauseVideo();
        updateUI();
    };
    
    const updateTimer = () => {
        if (timeRemaining > 0) timeRemaining--;
        updateUI();
        if (timeRemaining <= 0) {
            clearInterval(timer);
            switchMode();
        }
    };

    const switchMode = () => {
        if (isPlayerReady) ytPlayer.pauseVideo();
        isRunning = false;
        let notificationTitle = '', notificationBody = '';
        if (mode === 'focus') {
            const task = tasks.find(t => t.id === selectedTaskId);
            if (task) task.pomodoros++;
            pomodorosCompleted++;
            renderTasks();
            mode = (pomodorosCompleted % settings.longBreakInterval === 0) ? 'longBreak' : 'shortBreak';
            notificationTitle = 'Foco Concluído!';
            notificationBody = mode === 'longBreak' ? `Hora de uma pausa longa.` : `Faça uma pausa curta.`;
        } else {
            mode = 'focus';
            notificationTitle = 'Pausa Finalizada!';
            notificationBody = `Vamos voltar ao foco.`;
        }
        showNotification(notificationTitle, notificationBody);
        resetTimer();
    };

    const resetTimer = (forceMode = null) => {
        clearInterval(timer);
        isRunning = false;
        if (isPlayerReady) ytPlayer.pauseVideo();
        mode = forceMode || mode;
        timeRemaining = (settings[`${mode}Duration`] || 25) * 60;
        totalTime = timeRemaining;
        updateUI();
    };

    const updateUI = () => {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.title = `${timerDisplay.textContent} - Foco Total`;
        let modeColor, modeShadowColor;
        switch (mode) {
            case 'focus': modeColor = 'blue'; modeShadowColor = 'rgba(59, 130, 246, 0.7)'; break;
            case 'shortBreak': modeColor = 'green'; modeShadowColor = 'rgba(34, 197, 94, 0.7)'; break;
            case 'longBreak': modeColor = 'indigo'; modeShadowColor = 'rgba(99, 102, 241, 0.7)'; break;
        }
        progressRing.className = `text-${modeColor}-500`;
        progressRing.style.filter = `drop-shadow(0 0 5px ${modeShadowColor})`;
        startPauseBtn.style.boxShadow = `0 0 15px ${modeShadowColor}`;
        startPauseBtn.className = `w-full text-white font-bold py-3 rounded-xl text-base transition-all duration-300 transform hover:scale-105 shadow-lg bg-${modeColor}-600 hover:bg-${modeColor}-700`;
        startPauseBtn.textContent = isRunning ? 'Pausar' : (mode === 'focus' ? 'Iniciar Foco' : 'Iniciar Pausa');
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (timeRemaining / totalTime) * circumference;
        progressRing.style.strokeDasharray = circumference;
        progressRing.style.strokeDashoffset = isNaN(offset) ? circumference : offset;
        lucide.createIcons();
    };
    
    const renderTasks = () => {
        tasks.sort((a, b) => a.completed - b.completed);
        taskListEl.innerHTML = tasks.length === 0 ? '<p class="text-gray-500 text-center text-sm">Adicione sua primeira tarefa!</p>' : '';
        tasks.forEach(task => {
            const taskEl = document.createElement('div');
            const isSelected = task.id === selectedTaskId;
            const isCompleted = task.completed;
            taskEl.className = `task-item flex justify-between items-center bg-gray-900 p-2 rounded-lg border-2 border-transparent cursor-pointer ${isSelected ? 'selected' : ''} ${isCompleted ? 'completed' : ''}`;
            taskEl.dataset.id = task.id;
            const checkboxIcon = isCompleted ? 'check-square' : 'square';
            taskEl.innerHTML = `
                <div class="flex items-center flex-grow min-w-0">
                    <button data-complete-id="${task.id}" class="complete-btn text-gray-400 hover:text-green-500 mr-2 flex-shrink-0"><i data-lucide="${checkboxIcon}" class="w-5 h-5"></i></button>
                    <span class="task-name truncate pr-2 text-sm">${task.name}</span>
                </div>
                <div class="flex items-center space-x-2 flex-shrink-0">
                    <span class="text-xs text-gray-400 font-bold flex items-center"><i data-lucide="check-circle-2" class="w-4 h-4 mr-1 text-green-500"></i>${task.pomodoros}</span>
                    <button data-delete-id="${task.id}" class="delete-btn text-gray-500 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>`;
            taskEl.addEventListener('click', (e) => {
                if (!e.target.closest('.complete-btn') && !e.target.closest('.delete-btn')) {
                    selectTask(task.id);
                }
            });
            taskListEl.appendChild(taskEl);
        });
        updateCurrentTaskDisplay();
        saveState();
        lucide.createIcons();
    };

    const addTask = () => {
        const taskName = newTaskInput.value.trim();
        if (taskName) {
            const newTask = { id: Date.now(), name: taskName, pomodoros: 0, completed: false };
            tasks.push(newTask);
            newTaskInput.value = '';
            renderTasks();
            if (!selectedTaskId || tasks.find(t => t.id === selectedTaskId)?.completed) {
               selectTask(newTask.id);
            }
        }
    };

    const deleteTask = (id) => {
        tasks = tasks.filter(task => task.id !== id);
        if (selectedTaskId === id) {
            const firstIncompleteTask = tasks.find(t => !t.completed);
            selectedTaskId = firstIncompleteTask ? firstIncompleteTask.id : null;
            if (!isRunning) resetTimer('focus');
        }
        renderTasks();
    };

    const toggleTaskCompleted = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            if (task.completed && selectedTaskId === id) {
                const firstIncompleteTask = tasks.find(t => !t.completed);
                selectedTaskId = firstIncompleteTask ? firstIncompleteTask.id : null;
                if(isRunning && mode === 'focus') pauseTimer();
            }
            renderTasks();
        }
    };

    const selectTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task && !task.completed) {
            selectedTaskId = id;
            if (!isRunning && mode !== 'focus') resetTimer('focus');
            else renderTasks();
        }
    };
    
    const updateCurrentTaskDisplay = () => {
        const task = tasks.find(t => t.id === selectedTaskId);
        currentTaskDisplay.textContent = task ? task.name : 'Nenhuma tarefa selecionada';
        pomodoroCyclesEl.innerHTML = '';
        if (!settings.longBreakInterval) return;
        const cyclesToShow = pomodorosCompleted % settings.longBreakInterval;
        for(let i = 0; i < settings.longBreakInterval; i++) {
            const icon = i < cyclesToShow ? '<i data-lucide="check-circle-2" class="text-green-500"></i>' : '<i data-lucide="circle" class="text-gray-600"></i>';
            pomodoroCyclesEl.innerHTML += icon;
        }
        lucide.createIcons();
    };

    const saveState = () => {
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
        localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
        localStorage.setItem('pomodoroSelectedTaskId', JSON.stringify(selectedTaskId));
        localStorage.setItem('pomodoroCompletedCount', JSON.stringify(pomodorosCompleted));
        localStorage.setItem('pomodoroMusicVolume', volumeSlider.value);
        localStorage.setItem('pomodoroYoutubeApiKey', youtubeApiKey);
    };

    const loadState = () => {
        settings = { ...settings, ...JSON.parse(localStorage.getItem('pomodoroSettings')) };
        focusDurationInput.value = settings.focusDuration;
        shortBreakDurationInput.value = settings.shortBreakDuration;
        longBreakDurationInput.value = settings.longBreakDuration;
        longBreakIntervalInput.value = settings.longBreakInterval;
        tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];
        selectedTaskId = JSON.parse(localStorage.getItem('pomodoroSelectedTaskId'));
        if (selectedTaskId) {
            const task = tasks.find(t => t.id === selectedTaskId);
            if (!task || task.completed) selectedTaskId = null;
        }
        if (!selectedTaskId) {
            const firstIncompleteTask = tasks.find(t => !t.completed);
            if (firstIncompleteTask) selectedTaskId = firstIncompleteTask.id;
        }
        pomodorosCompleted = JSON.parse(localStorage.getItem('pomodoroCompletedCount')) || 0;
        const savedVolume = localStorage.getItem('pomodoroMusicVolume') || '50';
        volumeSlider.value = savedVolume;
        youtubeApiKey = localStorage.getItem('pomodoroYoutubeApiKey') || '';
        youtubeApiKeyInput.value = youtubeApiKey;
    };
    
    // --- EVENT LISTENERS ---
    startPauseBtn.addEventListener('click', () => isRunning ? pauseTimer() : startTimer());
    resetBtn.addEventListener('click', () => resetTimer(mode));
    settingsBtn.addEventListener('click', () => showModal(settingsModalOverlay));
    settingsSaveBtn.addEventListener('click', () => {
        settings.focusDuration = parseInt(focusDurationInput.value) || 25;
        settings.shortBreakDuration = parseInt(shortBreakDurationInput.value) || 5;
        settings.longBreakDuration = parseInt(longBreakDurationInput.value) || 15;
        settings.longBreakInterval = parseInt(longBreakIntervalInput.value) || 4;
        youtubeApiKey = youtubeApiKeyInput.value.trim();
        saveState();
        hideModal(settingsModalOverlay);
    });
    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });
    alertModalCloseBtn.addEventListener('click', () => hideModal(alertModalOverlay));
    searchResultsCloseBtn.addEventListener('click', () => hideModal(searchResultsModalOverlay));
    
    [alertModalOverlay, settingsModalOverlay, searchResultsModalOverlay].forEach(overlay => {
        overlay.addEventListener('click', (e) => { if (e.target === overlay) hideModal(overlay); });
    });

    taskListEl.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) { e.stopPropagation(); deleteTask(parseInt(deleteBtn.dataset.deleteId)); return; }
        const completeBtn = e.target.closest('.complete-btn');
        if (completeBtn) { e.stopPropagation(); toggleTaskCompleted(parseInt(completeBtn.dataset.completeId)); }
    });
    
    if (navigator.share) {
        shareBtn.addEventListener('click', async () => {
            try { await navigator.share({ title: 'Foco Total - App Pomodoro', text: 'Gerencie seu foco e produtividade!', url: window.location.href }); } catch (error) { console.error('Erro ao compartilhar:', error); }
        });
    } else { shareBtn.style.display = 'none'; }
    
    volumeSlider.addEventListener('input', (e) => { if (isPlayerReady) ytPlayer.setVolume(e.target.value); });
    
    enableNotificationsBtn.addEventListener('click', () => { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().then(updateNotificationStatusUI); });
    
    youtubeSearchBtn.addEventListener('click', searchYouTube);
    youtubeSearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchYouTube(); });
    
    playLinkBtn.addEventListener('click', playFromLink);
    youtubeLinkInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') playFromLink(); });

    // --- INICIALIZAÇÃO DA APLICAÇÃO ---
    function main() {
        loadState(); renderTasks(); resetTimer('focus'); lucide.createIcons(); updateNotificationStatusUI();
    }
    
    if (window.YT_API_READY) { main(); initializePlayer(); } 
    else { document.addEventListener('ytApiReady', () => { main(); initializePlayer(); }, { once: true }); }
});
