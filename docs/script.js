document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
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
    const alertModalMessage = document.getElementById('alert-modal-message');
    const alertModalCloseBtn = document.getElementById('alert-modal-close-btn');
    
    const settingsModalOverlay = document.getElementById('settings-modal-overlay');
    const settingsSaveBtn = document.getElementById('settings-save-btn');
    const focusDurationInput = document.getElementById('focus-duration');
    const shortBreakDurationInput = document.getElementById('short-break-duration');
    const longBreakDurationInput = document.getElementById('long-break-duration');
    const longBreakIntervalInput = document.getElementById('long-break-interval');
    
    const musicPlayerContainer = document.getElementById('music-player-container');
    const volumeSlider = document.getElementById('volume-slider');
    const musicStatus = document.getElementById('music-status');
    const expandPlayerBtn = document.getElementById('expand-player-btn');
    const canvas = document.getElementById('sound-wave-canvas');
    const canvasCtx = canvas.getContext('2d');
    const toggleRandomBtn = document.getElementById('toggle-random-btn'); // Novo elemento para o botão de modo aleatório

    const enableNotificationsBtn = document.getElementById('enable-notifications-btn');
    const notificationsStatusMsg = document.getElementById('notifications-status-msg');

    const audioPlayer = document.getElementById('audio-player');
    const musicSelect = document.getElementById('music-select');

    // Estado da aplicação
    let timer, isRunning = false, mode = 'focus', timeRemaining, totalTime;
    let tasks = [], selectedTaskId = null, pomodorosCompleted = 0;
    let settings = { focusDuration: 25, shortBreakDuration: 5, longBreakDuration: 15, longBreakInterval: 4 };
    let currentSongIndex = 0;
    let isRandomMode = false; // Novo estado para o modo aleatório

    // Variáveis da Web Audio API
    let audioContext; 
    let analyser;
    let audioSource;
    let dataArray;
    let visualizerAnimationId;
    let isAudioInitialized = false; // Flag para controlar a inicialização

    // Lista de músicas atualizada com as 6 fornecidas
    const songList = [
        {
            title: 'Breathe Chill Lofi Beats',
            artist: 'Pixabay',
            url: 'https://jonatas07rocha.github.io/pomodoro/audio/breathe-chill-lofi-beats-362644.mp3'
        },
        {
            title: 'Bright Sun Chill Lofi',
            artist: 'Pixabay',
            url: 'https://jonatas07rocha.github.io/pomodoro/audio/bright-sun-chill-lofi-324134.mp3'
        },
        {
            title: 'Card Games Lofi Chill',
            artist: 'Pixabay',
            url: 'https://jonatas07rocha.github.io/pomodoro/audio/card-games-lofi-chill-315489.mp3'
        },
        {
            title: 'Lofi Chill Background Music',
            artist: 'Pixabay',
            url: 'https://jonatas07rocha.github.io/pomodoro/audio/lofi-chill-background-music-313055.mp3'
        },
        {
            title: 'Moving On Lofi',
            artist: 'Pixabay',
            url: 'https://jonatas07rocha.github.io/pomodoro/audio/moving-on-lofi-309231.mp3'
        },
        {
            title: 'Time For Bed Chill Lofi',
            artist: 'Pixabay',
            url: 'https://jonatas07rocha.github.io/pomodoro/audio/time-for-bed-chill-lofi-315485.mp3'
        }
    ];

    // --- Funções do Player de Áudio ---
    function populateMusicSelector() {
        musicSelect.innerHTML = ''; // Limpa as opções existentes
        songList.forEach((song, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${song.title} - ${song.artist}`;
            musicSelect.appendChild(option);
        });
        // Seleciona a música atual se houver
        musicSelect.value = currentSongIndex;
    }

    function loadSong(index) {
        currentSongIndex = parseInt(index);
        const song = songList[currentSongIndex];
        if (song) {
            audioPlayer.src = song.url;
            console.log("Attempting to set audio source to:", song.url); // Log the URL being set
            musicStatus.textContent = `${song.title} - ${song.artist}`;
            musicStatus.title = `${song.title} - ${song.artist}`;
            localStorage.setItem('pomodoroLastSongIndex', currentSongIndex);
            updateMusicStatusMarquee();
        } else {
            console.warn("No song found for index:", index); // Log if song is not found
            musicStatus.textContent = "Nenhuma música carregada.";
            musicStatus.title = "Nenhuma música carregada.";
            audioPlayer.src = ''; // Limpa a fonte do áudio
            stopVisualizer();
        }
    }

    function playRandomSong() {
        if (songList.length === 0) {
            console.warn("No songs in the list to play randomly.");
            return;
        }
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * songList.length);
        } while (randomIndex === currentSongIndex && songList.length > 1); // Evita repetir a mesma música se houver mais de uma
        
        loadSong(randomIndex);
        if (isRunning) { // Tenta tocar apenas se o timer estiver rodando
            audioPlayer.play().then(() => {
                console.log("Random audio started successfully.");
                setMusicPlayerView('minimized');
                startVisualizer();
            }).catch(error => {
                console.error("Error playing random audio:", error);
                if (error.name === "NotAllowedError" || error.name === "NotSupportedError") {
                    showModal(alertModalOverlay, 'O navegador bloqueou a reprodução automática. Por favor, clique em "Pausar" e "Iniciar Foco" novamente para ativar o som.');
                } else {
                    showModal(alertModalOverlay, `Erro ao reproduzir áudio aleatório: ${error.message}. Verifique o console para mais detalhes.`);
                }
            });
        }
    }
    
    // --- Funções da Web Audio API e Visualizador ---
    function initAudioSystem() {
        if (isAudioInitialized) return;
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            audioSource = audioContext.createMediaElementSource(audioPlayer);
            
            audioSource.connect(analyser);
            analyser.connect(audioContext.destination);
            
            analyser.fftSize = 64;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            isAudioInitialized = true;
            console.log("Audio system initialized successfully.");
        } catch (e) {
            console.error("Could not initialize audio system:", e);
        }
    }
    
    function startVisualizer() {
        if (!isAudioInitialized) return;
        if (visualizerAnimationId) cancelAnimationFrame(visualizerAnimationId);

        const draw = () => {
            visualizerAnimationId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            const dpr = window.devicePixelRatio || 1;
            const canvasWidth = canvas.offsetWidth;
            const canvasHeight = canvas.offsetHeight;
            canvas.width = canvasWidth * dpr;
            canvas.height = canvasHeight * dpr;
            canvasCtx.scale(dpr, dpr);
            
            canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

            const bufferLength = analyser.frequencyBinCount;
            const barWidth = (canvasWidth / bufferLength) * 0.8;
            const barSpacing = (canvasWidth / bufferLength) * 0.2;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvasHeight;
                const gradient = canvasCtx.createLinearGradient(0, canvasHeight, 0, 0);
                gradient.addColorStop(0, '#8B5CF6');
                gradient.addColorStop(0.5, '#A78BFA');
                gradient.addColorStop(1, '#C4B5FD');
                
                canvasCtx.fillStyle = gradient;
                canvasCtx.fillRect(x, canvasHeight - barHeight, barWidth, barHeight);
                x += barWidth + barSpacing;
            }
        };
        draw();
    }

    function stopVisualizer() {
        if (visualizerAnimationId) {
            cancelAnimationFrame(visualizerAnimationId);
            visualizerAnimationId = null;
            if(canvas) {
                const dpr = window.devicePixelRatio || 1;
                setTimeout(() => canvasCtx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr), 100);
            }
        }
    }

    // --- Funções Principais ---
    const showNotification = (title, body) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const task = tasks.find(t => t.id === selectedTaskId);
            const options = {
                body: body + (task && mode === 'focus' ? `\nTarefa atual: ${task.name}` : ''),
                icon: favicon.href 
            };
            new Notification(title, options);
        }
    };

    const updateNotificationStatusUI = () => {
        if (!('Notification' in window)) {
            enableNotificationsBtn.disabled = true;
            notificationsStatusMsg.textContent = 'Este navegador não suporta notificações.';
            enableNotificationsBtn.style.display = 'none';
            return;
        }
        
        enableNotificationsBtn.className = 'text-white font-bold py-1 px-3 rounded-lg transition-colors text-xs';

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
                notificationsStatusMsg.textContent = 'Você bloqueou as notificações. Altere nas configurações do seu navegador para reativar.';
                break;
            default: 
                enableNotificationsBtn.textContent = 'Ativar';
                enableNotificationsBtn.disabled = false;
                enableNotificationsBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                notificationsStatusMsg.textContent = 'Clique em "Ativar" para permitir as notificações.';
                break;
        }
    };
    
    const playSound = () => {
        if (!isAudioInitialized) return; 
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        const now = audioContext.currentTime;
        const fundamental = 440, duration = 0.1, gap = 0.15;
        for (let i = 0; i < 3; i++) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(fundamental * (i % 2 === 0 ? 1.5 : 2), now + i * gap);
            gainNode.gain.setValueAtTime(0.15, now + i * gap);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + i * gap + duration);
            oscillator.start(now + i * gap);
            oscillator.stop(now + i * gap + duration);
        }
    };

    const showModal = (modalOverlay, message) => {
        if (message) {
            const messageEl = modalOverlay.querySelector('p');
            if(messageEl) messageEl.textContent = message;
        }
        modalOverlay.classList.add('visible');
    };

    const hideModal = (modalOverlay) => modalOverlay.classList.remove('visible');

    const startTimer = () => {
        if (isRunning) return;
        if (!selectedTaskId && mode === 'focus') {
            showModal(alertModalOverlay, 'Por favor, selecione uma tarefa para iniciar o foco.');
            return;
        }
        
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                updateNotificationStatusUI();
            });
        }

        isRunning = true;
        timer = setInterval(updateTimer, 1000);
        
        // Chame initAudioSystem() antes de tentar tocar
        if (!isAudioInitialized) {
            initAudioSystem();
        }

        console.log("Audio player source before play():", audioPlayer.src); // Log the source right before playing

        if (audioPlayer.paused) { // Verifica se o áudio está pausado antes de tentar tocar
            if (isRandomMode) {
                playRandomSong();
            } else if (audioPlayer.src) { // Só tenta tocar se houver uma fonte definida
                audioPlayer.play().then(() => {
                    console.log("Audio started successfully.");
                    setMusicPlayerView('minimized');
                    startVisualizer();
                }).catch(error => {
                    console.error("Error playing audio:", error);
                    if (error.name === "NotAllowedError" || error.name === "NotSupportedError") {
                        showModal(alertModalOverlay, 'O navegador bloqueou a reprodução automática. Por favor, clique em "Pausar" e "Iniciar Foco" novamente para ativar o som.');
                    } else {
                        showModal(alertModalOverlay, `Erro ao reproduzir áudio: ${error.message}. Verifique o console para mais detalhes.`);
                    }
                });
            } else {
                console.warn("No audio source set to play.");
            }
        }
        updateUI();
    };

    const pauseTimer = () => {
        if (!isRunning) return;
        isRunning = false;
        clearInterval(timer);
        audioPlayer.pause();
        stopVisualizer();
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
        playSound(); // Este é o som de notificação, não a música de fundo
        audioPlayer.pause();
        stopVisualizer();

        isRunning = false;
        let notificationTitle = '';
        let notificationBody = '';

        if (mode === 'focus') {
            const task = tasks.find(t => t.id === selectedTaskId);
            if (task) {
                task.pomodoros++;
            }
            pomodorosCompleted++;
            renderTasks();
            mode = (pomodorosCompleted % settings.longBreakInterval === 0) ? 'longBreak' : 'shortBreak';
            
            notificationTitle = 'Sessão de Foco Concluída!';
            notificationBody = mode === 'longBreak' 
                ? `Hora de uma pausa longa de ${settings.longBreakDuration} minutos.` 
                : `Faça uma pausa curta de ${settings.shortBreakDuration} minutos.`;
        } else {
            mode = 'focus';
            notificationTitle = 'Pausa Finalizada!';
            notificationBody = `Vamos voltar ao foco por ${settings.focusDuration} minutos.`;
        }
        
        showNotification(notificationTitle, notificationBody);
        resetTimer();
    };

    const resetTimer = (forceMode = null) => {
        clearInterval(timer);
        isRunning = false;
        audioPlayer.pause();
        stopVisualizer();
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
            case 'focus':
                modeColor = 'blue';
                modeShadowColor = 'rgba(59, 130, 246, 0.7)';
                break;
            case 'shortBreak':
                modeColor = 'green';
                modeShadowColor = 'rgba(34, 197, 94, 0.7)';
                break;
            case 'longBreak':
                modeColor = 'indigo';
                modeShadowColor = 'rgba(99, 102, 241, 0.7)';
                break;
        }

        progressRing.setAttribute('class', `text-${modeColor}-500`);
        progressRing.style.filter = `drop-shadow(0 0 5px ${modeShadowColor})`;
        startPauseBtn.style.boxShadow = `0 0 15px ${modeShadowColor}`;
        startPauseBtn.setAttribute('class', `w-full text-white font-bold py-3 rounded-xl text-base transition-all duration-300 transform hover:scale-105 shadow-lg bg-${modeColor}-600 hover:bg-${modeColor}-700`);
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
                </div>
            `;
            
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
                if(isRunning && mode === 'focus') {
                    pauseTimer();
                }
            }
            renderTasks();
        }
    };

    const selectTask = (id) => {
        const task = tasks.find(t => t.id === id);
        if (task && !task.completed) {
            selectedTaskId = id;
            if (!isRunning && mode !== 'focus') {
                resetTimer('focus');
            } else {
                renderTasks();
            }
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
        localStorage.setItem('pomodoroLastSongIndex', currentSongIndex);
        localStorage.setItem('pomodoroIsRandomMode', isRandomMode); // Salva o estado do modo aleatório
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
            if (!task || task.completed) {
                selectedTaskId = null;
            }
        }
        if (!selectedTaskId) {
            const firstIncompleteTask = tasks.find(t => !t.completed);
            if (firstIncompleteTask) {
                selectedTaskId = firstIncompleteTask.id;
            }
        }

        pomodorosCompleted = JSON.parse(localStorage.getItem('pomodoroCompletedCount')) || 0;

        const savedVolume = localStorage.getItem('pomodoroMusicVolume') || '50';
        volumeSlider.value = savedVolume;
        audioPlayer.volume = savedVolume / 100;

        // Carrega o estado do modo aleatório
        isRandomMode = localStorage.getItem('pomodoroIsRandomMode') === 'true'; 
        updateRandomModeButtonUI(); // Atualiza o texto do botão

        const lastSongIndex = localStorage.getItem('pomodoroLastSongIndex') || 0;
        musicSelect.value = lastSongIndex;
        loadSong(lastSongIndex);
    };
    
    function updateMusicStatusMarquee() {
        const title = musicStatus.textContent;
        const containerWidth = musicStatus.parentElement.offsetWidth;
        const tempSpan = document.createElement('span');
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.style.whiteSpace = 'nowrap';
        tempSpan.style.fontSize = getComputedStyle(musicStatus).fontSize;
        tempSpan.textContent = title;
        document.body.appendChild(tempSpan);
        const textWidth = tempSpan.offsetWidth;
        document.body.removeChild(tempSpan);
        
        if (textWidth > containerWidth) {
            musicStatus.classList.add('scrolling');
        } else {
            musicStatus.classList.remove('scrolling');
        }
    }
    
    function setMusicPlayerView(view) {
        if (view === 'minimized') {
            musicPlayerContainer.classList.remove('music-player-maximized');
            musicPlayerContainer.classList.add('music-player-minimized');
        } else {
            musicPlayerContainer.classList.remove('music-player-minimized');
            musicPlayerContainer.classList.add('music-player-maximized');
        }
    }

    function updateRandomModeButtonUI() {
        toggleRandomBtn.textContent = `Modo Aleatório: ${isRandomMode ? 'Ativado' : 'Desativado'}`;
        toggleRandomBtn.classList.toggle('bg-blue-600', isRandomMode);
        toggleRandomBtn.classList.toggle('hover:bg-blue-700', isRandomMode);
        toggleRandomBtn.classList.toggle('bg-gray-600', !isRandomMode);
        toggleRandomBtn.classList.toggle('hover:bg-gray-700', !isRandomMode);
    }

    // --- Event Listeners ---
    startPauseBtn.addEventListener('click', () => {
        if (!isAudioInitialized) {
            initAudioSystem();
        }
        isRunning ? pauseTimer() : startTimer();
    });
    resetBtn.addEventListener('click', () => resetTimer(mode));
    settingsBtn.addEventListener('click', () => {
        updateNotificationStatusUI();
        showModal(settingsModalOverlay);
    });
    settingsSaveBtn.addEventListener('click', () => {
        settings.focusDuration = parseInt(focusDurationInput.value) || 25;
        settings.shortBreakDuration = parseInt(shortBreakDurationInput.value) || 5;
        settings.longBreakDuration = parseInt(longBreakDurationInput.value) || 15;
        settings.longBreakInterval = parseInt(longBreakIntervalInput.value) || 4;
        saveState();
        if (!isRunning) resetTimer(mode);
        hideModal(settingsModalOverlay);
    });
    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });
    alertModalCloseBtn.addEventListener('click', () => hideModal(alertModalOverlay));
    [alertModalOverlay, settingsModalOverlay].forEach(overlay => {
        overlay.addEventListener('click', (e) => { if (e.target === overlay) hideModal(overlay); });
    });
    taskListEl.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            e.stopPropagation();
            deleteTask(parseInt(deleteButton.dataset.deleteId));
            return;
        }
        const completeButton = e.target.closest('.complete-btn');
        if (completeButton) {
            e.stopPropagation();
            toggleTaskCompleted(parseInt(completeButton.dataset.completeId));
        }
    });
    
    if (navigator.share) {
        shareBtn.addEventListener('click', async () => {
            try {
                await navigator.share({
                    title: 'Foco Total - App Pomodoro',
                    text: 'Use este app Pomodoro para aumentar sua produtividade e gerenciar suas tarefas!',
                    url: window.location.href,
                });
            } catch (error) {
                console.error('Erro ao compartilhar:', error);
            }
        });
    } else {
        shareBtn.style.display = 'none';
    }
    
    musicSelect.addEventListener('change', (e) => {
        if (!isAudioInitialized) {
            initAudioSystem();
        }
        // Quando o usuário seleciona uma música, desativa o modo aleatório
        isRandomMode = false; 
        updateRandomModeButtonUI();
        loadSong(e.target.value);
        if (isRunning) {
            audioPlayer.play();
        }
    });

    volumeSlider.addEventListener('input', (e) => {
        audioPlayer.volume = e.target.value / 100;
    });

    expandPlayerBtn.addEventListener('click', () => {
        setMusicPlayerView('maximized');
    });

    toggleRandomBtn.addEventListener('click', () => {
        isRandomMode = !isRandomMode;
        updateRandomModeButtonUI();
        saveState(); // Salva o novo estado do modo aleatório
        if (isRandomMode && isRunning && audioPlayer.paused) {
            playRandomSong(); // Inicia a reprodução aleatória se o timer estiver rodando e o áudio pausado
        } else if (!isRandomMode && isRunning && audioPlayer.paused) {
            // Se desativar o modo aleatório, volta para a música selecionada no dropdown
            loadSong(musicSelect.value);
            audioPlayer.play();
        }
    });
    
    // Evento para tocar a próxima música aleatória quando a atual terminar
    audioPlayer.addEventListener('ended', () => {
        if (isRandomMode) {
            playRandomSong();
        }
    });
    
    enableNotificationsBtn.addEventListener('click', () => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(() => {
                updateNotificationStatusUI();
            });
        }
    });
    
    // --- Inicialização ---
    populateMusicSelector();
    loadState();
    renderTasks();
    resetTimer('focus');
    lucide.createIcons();
    updateNotificationStatusUI();
});