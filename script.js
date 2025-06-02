// script.js - PTE Navigator Pro - "1000x Further Enhanced" Version

/**
 * @file Main script for PTE Navigator Pro, a Pearson Test of English preparation tool.
 * This version focuses on maximum encapsulation, reduced global scope, and improved robustness
 * within a single-file vanilla JavaScript structure.
 */

// Main Application Module (IIFE)
const PTEApp = (function() {
    "use strict";

    // --- Application State (All encapsulated within the IIFE) ---
    let allExercises = [];
    let filteredExercises = [];
    let currentExerciseIndexInFiltered = -1;
    let currentActualExercise = null;
    let userAnswers = {};
    let userConfidence = {};
    let currentBlankForConfidence = -1; // Index of the blank currently being asked for confidence
    let linguisticResources = null; // Stores global linguistic resources
    let currentUIMode = 'student'; // 'student', 'admin', 'settings'
    let currentExerciseTypeFilter = 'all'; // 'all', 'FIB_RW', 'DND', etc.
    let pendingConfidenceChecks = []; // Array of blank indices to ask confidence for
    let currentConfidencePromptIndex = -1; // Current index in pendingConfidenceChecks
    let exerciseStartTime = null; // Timestamp for the start of an exercise attempt
    let totalStudyTime = 0; // In seconds, loaded from localStorage
    let studyTimerInterval = null; // Interval ID for the global study timer
    let isPosDisplayActive = false; // Toggles Part-of-Speech display

    let appSettings = {
        theme: 'system', // 'light', 'dark', 'system'
        fontSize: 'medium', // 'small', 'medium', 'large'
        animationsEnabled: true,
        highContrastEnabled: false,
        dyslexicFontEnabled: false,
        autoSaveProgress: true,
        showExerciseTimer: true, // Whether to display individual exercise timers
        showDifficultyLevels: true,
    };

    let studentStats = {
        completedExercisesSet: new Set(), // Set of IDs of completed exercises
        totalScoreSum: 0, // Sum of all percentage scores
        totalAttemptsAtCompletion: 0, // Number of times exercises were submitted
        dailyStreak: 0,
        lastLoginDate: null, // ISO date string (YYYY-MM-DD)
    };

    // --- Constants ---
    const ADMIN_PASSWORD_HASH_NOTE = "NOTE: This hash is 'password' (MD5). For production, use a secure server-side auth.";
    const ADMIN_PASSWORD_HASH = "5f4dcc3b5aa765d61d8327deb882cf99"; // MD5 of "password"
    const STORAGE_PREFIX = "pteNavigatorPro_";
    const EXERCISE_STORAGE_KEY = `${STORAGE_PREFIX}exercises_v7_encapsulated`;
    const LINGUISTIC_RESOURCES_STORAGE_KEY = `${STORAGE_PREFIX}linguisticResources_v7_encapsulated`;
    const STATS_STORAGE_KEY = `${STORAGE_PREFIX}stats_v7_encapsulated`;
    const SETTINGS_STORAGE_KEY = `${STORAGE_PREFIX}settings_v2_encapsulated`;
    const STUDY_TIME_STORAGE_KEY = `${STORAGE_PREFIX}studyTime_v2_encapsulated`;
    // Future expansion:
    // const VOCABULARY_STORAGE_KEY = `${STORAGE_PREFIX}vocabulary_v1`;
    // const NOTES_STORAGE_KEY = `${STORAGE_PREFIX}notes_v1`;
    // const FLASHCARDS_STORAGE_KEY = `${STORAGE_PREFIX}flashcards_v1`;


    // --- DOM Elements Cache (Scoped within IIFE) ---
    // These will be populated by cacheDOMElementsOnce
    let studentModeBtn, adminModeBtn, settingsBtnHeader, studentPanel, adminPanel, settingsPanel,
        statTotalExercisesEl, statCompletedExercisesEl, statAverageScoreEl, statStudyTimeEl, statStreakEl,
        exerciseTypeFilterButtons, studentExerciseSelector, exerciseSearchInput, exerciseSearchBtn,
        recommendExerciseBtn, difficultyIndicator, difficultyLevelText,
        currentExerciseTitleEl, passageContainer, dndOptionsContainer,
        submitAnswersBtn, resetExerciseBtn, nextExerciseBtn, prevExerciseBtn, getInitialHintsBtn,
        scoreDisplayEl, scoreTextEl, progressFillEl, feedbackSection,
        adminUploadArea, adminFileInput, adminUploadStatusEl, adminClearExercisesBtn, adminExerciseListPreviewEl,
        createExerciseAdminBtn, exportUserDataAdminBtn,
        confidenceModal, confidenceBlankNumberSpan, infoModal, infoModalTitle, infoModalContent,
        togglePosBtn, darkModeToggleBtn,
        themeSelector, fontSizeSelector, animationsToggle, highContrastToggle, dyslexicFontToggle,
        autoSaveToggle, showTimerToggle, showDifficultyToggle,
        importUserDataSettingsBtn, exportUserDataSettingsBtn, resetAppSettingsBtn, saveSettingsBtn,
        vocabularyToolBtn, vocabularyModal, notepadBtn, notepadModal,
        flashcardsBtn, flashcardsModal, progressBtn, progressModal,
        toastNotificationsContainer, currentYearEl;

    /**
     * Simple string hashing function (MD5-like, NOT for secure password storage in production).
     * Kept for compatibility with existing admin password hash.
     * @param {string} str - The string to hash
     * @returns {string} - Hash of the input string
     */
    function simpleHash(str) {
        // IMPORTANT: This is a simple, non-cryptographically secure hashing function.
        // It's used here ONLY for the demo admin password.
        // For any real-world application, use proper server-side authentication and bcrypt/scrypt/argon2 for password hashing.
        let hash = 0;
        if (str.length === 0) return hash.toString();

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        // For demo purposes, if the input is "password", return the pre-calculated MD5
        if (str === "password") {
            return "5f4dcc3b5aa765d61d8327deb882cf99";
        }
        // Fallback for other strings (less likely to match the admin hash)
        return Math.abs(hash).toString(16);
    }

    /**
     * Replaces the first occurrence of a search string in a target string.
     * @param {string} targetString - The string to search within.
     * @param {string} search - The string to search for.
     * @param {string} replace - The string to replace with.
     * @returns {string} The modified string or the original if search string not found.
     */
    function replaceFirstOccurrence(targetString, search, replace) {
        if (typeof targetString !== 'string') return '';
        const i = targetString.indexOf(search);
        if (i === -1) return targetString;
        return targetString.substring(0, i) + replace + targetString.substring(i + search.length);
    }

    function cacheDOMElementsOnce() {
        studentModeBtn = document.getElementById('studentModeBtn');
        adminModeBtn = document.getElementById('adminModeBtn');
        settingsBtnHeader = document.querySelector('.mode-selector .settings-btn-header');
        studentPanel = document.getElementById('studentPanel');
        adminPanel = document.getElementById('adminPanel');
        settingsPanel = document.getElementById('settingsPanel');

        statTotalExercisesEl = document.getElementById('statTotalExercises');
        statCompletedExercisesEl = document.getElementById('statCompletedExercises');
        statAverageScoreEl = document.getElementById('statAverageScore');
        statStudyTimeEl = document.getElementById('statStudyTime');
        statStreakEl = document.getElementById('statStreak');

        exerciseTypeFilterButtons = document.querySelectorAll('.exercise-type-selector .type-btn');
        studentExerciseSelector = document.getElementById('studentExerciseSelector');
        exerciseSearchInput = document.getElementById('exerciseSearchInput');
        exerciseSearchBtn = document.getElementById('exerciseSearchBtn');
        recommendExerciseBtn = document.getElementById('recommendExerciseBtn');
        difficultyIndicator = document.getElementById('difficultyIndicator');
        difficultyLevelText = document.getElementById('difficultyLevelText');

        currentExerciseTitleEl = document.getElementById('currentExerciseTitle');
        passageContainer = document.getElementById('passageContainer');
        dndOptionsContainer = document.getElementById('dndOptionsContainer');

        submitAnswersBtn = document.getElementById('submitAnswersBtn');
        resetExerciseBtn = document.getElementById('resetExerciseBtn');
        prevExerciseBtn = document.getElementById('prevExerciseBtn');
        nextExerciseBtn = document.getElementById('nextExerciseBtn');
        getInitialHintsBtn = document.getElementById('getInitialHintsBtn');
        togglePosBtn = document.getElementById('togglePosBtn');

        scoreDisplayEl = document.getElementById('scoreDisplay');
        scoreTextEl = document.getElementById('scoreText');
        progressFillEl = document.getElementById('progressFill');
        feedbackSection = document.getElementById('feedbackSection');

        adminUploadArea = document.getElementById('adminUploadArea');
        adminFileInput = document.getElementById('adminFileInput');
        adminUploadStatusEl = document.getElementById('adminUploadStatus');
        adminClearExercisesBtn = document.getElementById('adminClearExercisesBtn');
        adminExerciseListPreviewEl = document.getElementById('adminExerciseListPreview');
        createExerciseAdminBtn = document.getElementById('createExerciseAdminBtn');
        exportUserDataAdminBtn = document.getElementById('exportUserDataAdminBtn');

        confidenceModal = document.getElementById('confidenceModal');
        confidenceBlankNumberSpan = document.getElementById('confidenceBlankNumber');
        infoModal = document.getElementById('infoModal');
        infoModalTitle = document.getElementById('infoModalDialogTitle');
        infoModalContent = document.getElementById('infoModalContent');

        darkModeToggleBtn = document.getElementById('darkModeToggle');

        themeSelector = document.getElementById('themeSelector');
        fontSizeSelector = document.getElementById('fontSizeSelector');
        animationsToggle = document.getElementById('animationsToggle');
        highContrastToggle = document.getElementById('highContrastToggle');
        dyslexicFontToggle = document.getElementById('dyslexicFontToggle');
        autoSaveToggle = document.getElementById('autoSaveToggle');
        showTimerToggle = document.getElementById('showTimerToggle');
        showDifficultyToggle = document.getElementById('showDifficultyToggle');
        importUserDataSettingsBtn = document.getElementById('importUserDataSettingsBtn');
        exportUserDataSettingsBtn = document.getElementById('exportUserDataSettingsBtn');
        resetAppSettingsBtn = document.getElementById('resetAppSettingsBtn');
        saveSettingsBtn = document.getElementById('saveSettingsBtn');

        vocabularyToolBtn = document.getElementById('vocabularyToolBtn'); // Example, implement fully if needed
        vocabularyModal = document.getElementById('vocabularyModal');
        notepadBtn = document.getElementById('notepadBtn');
        notepadModal = document.getElementById('notepadModal');
        flashcardsBtn = document.getElementById('flashcardsBtn');
        flashcardsModal = document.getElementById('flashcardsModal');
        progressBtn = document.getElementById('progressBtn');
        progressModal = document.getElementById('progressModal');

        toastNotificationsContainer = document.getElementById('toastNotificationsContainer');
        currentYearEl = document.getElementById('currentYear');
    }

    function init() {
        cacheDOMElementsOnce();

        if (!studentModeBtn || !passageContainer || !currentExerciseTitleEl ) {
            console.error("PTEApp: Critical DOM elements missing. Aborting initialization.");
            // Optionally, display a message to the user on the page itself
            const body = document.querySelector('body');
            if (body) {
                body.innerHTML = `<div style="padding: 20px; text-align: center; font-family: sans-serif;">
                                    <h1>Application Error</h1>
                                    <p>Critical components failed to load. Please try refreshing the page or contact support.</p>
                                  </div>`;
            }
            return;
        }
        console.log("PTEApp initializing...");
        loadSettings();
        applySettings(); // Apply loaded or default settings

        loadExercisesAndResourcesFromStorage();
        loadStatsFromStorage();
        loadStudyTime();
        updateStreak(); // Must be after loading stats

        bindCoreEventListeners();
        bindToolEventListeners(); // For vocab, notepad, etc.
        bindSettingsEventListeners();

        switchUIMode('student'); // Default to student mode

        if(currentYearEl) currentYearEl.textContent = new Date().getFullYear();

        // Service Worker registration (if applicable)
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js') // Ensure path is correct
                    .then(reg => console.log('Service Worker registered.', reg.scope))
                    .catch(err => console.error('Service Worker registration failed:', err));
            });
        }

        startGlobalStudyTimer(); // Start tracking study time if enabled
        console.log("PTEApp Initialization complete.");
    }

    // --- Event Listener Binding ---
    function bindCoreEventListeners() {
        if(studentModeBtn) studentModeBtn.addEventListener('click', () => switchUIMode('student'));
        if(adminModeBtn) adminModeBtn.addEventListener('click', () => switchUIMode('admin'));
        if(settingsBtnHeader) settingsBtnHeader.addEventListener('click', () => switchUIMode('settings'));

        if(exerciseTypeFilterButtons) {
            exerciseTypeFilterButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    exerciseTypeFilterButtons.forEach(b => b.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    currentExerciseTypeFilter = e.currentTarget.dataset.typeFilter;
                    applyExerciseFilterAndRender();
                });
            });
        }

        if(studentExerciseSelector) studentExerciseSelector.addEventListener('change', loadSelectedExerciseFromDropdown);
        if(submitAnswersBtn) submitAnswersBtn.addEventListener('click', preCheckAllAnswers);
        if(resetExerciseBtn) resetExerciseBtn.addEventListener('click', resetCurrentExercise);
        if(prevExerciseBtn) prevExerciseBtn.addEventListener('click', loadPreviousExercise);
        if(nextExerciseBtn) nextExerciseBtn.addEventListener('click', loadNextExercise);
        if(getInitialHintsBtn) getInitialHintsBtn.addEventListener('click', togglePassageClueEmphasis);
        if(togglePosBtn) togglePosBtn.addEventListener('click', togglePosDisplay);
        if(darkModeToggleBtn) darkModeToggleBtn.addEventListener('click', toggleDarkMode); // If a dedicated dark mode toggle exists

        // Admin panel listeners
        if(adminUploadArea) adminUploadArea.addEventListener('click', () => { if(adminFileInput) adminFileInput.click(); });
        if(adminFileInput) adminFileInput.addEventListener('change', handleAdminFileSelect);
        if(adminUploadArea) {
            adminUploadArea.addEventListener('dragover', handleAdminDragOver);
            adminUploadArea.addEventListener('dragleave', handleAdminDragLeave);
            adminUploadArea.addEventListener('drop', handleAdminDrop);
        }
        if(adminClearExercisesBtn) adminClearExercisesBtn.addEventListener('click', clearAllStoredDataAdmin);
        if(createExerciseAdminBtn) createExerciseAdminBtn.addEventListener('click', () => openModal('createExerciseModal')); // Assumes modal exists
        if(exportUserDataAdminBtn) exportUserDataAdminBtn.addEventListener('click', exportAllUserData);

        // Modal close buttons
        document.querySelectorAll('.modal .close-button').forEach(btn => {
            btn.addEventListener('click', function() {
                const modalId = this.dataset.modalClose || this.closest('.modal')?.id;
                if(modalId) closeModal(modalId);
            });
        });

        // Confidence modal buttons
        document.querySelectorAll('#confidenceModal .confidence-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                setConfidence(currentBlankForConfidence, this.dataset.level);
                closeModal('confidenceModal');
                checkNextConfidenceOrProceed();
            });
        });

        // Global dynamic click and keydown handlers
        document.addEventListener('click', handleDynamicClicks); // For dynamically generated content like hints
        document.addEventListener('keydown', handleGlobalKeydown); // For Esc to close modals
        document.addEventListener('dragend', handleGlobalDragEnd); // For DND cleanup

        // Search
        if(exerciseSearchBtn && exerciseSearchInput) {
            exerciseSearchBtn.addEventListener('click', filterExercisesBySearch);
            exerciseSearchInput.addEventListener('keyup', (e) => { if(e.key === 'Enter') filterExercisesBySearch(); });
        }
        if(recommendExerciseBtn) recommendExerciseBtn.addEventListener('click', getAIRecommendedExercise);
    }

    function bindToolEventListeners() {
        // Example: these would open respective modals or tool views
        if(vocabularyToolBtn) vocabularyToolBtn.addEventListener('click', () => openModal('vocabularyModal'));
        if(notepadBtn) notepadBtn.addEventListener('click', () => openModal('notepadModal'));
        if(flashcardsBtn) flashcardsBtn.addEventListener('click', () => openModal('flashcardsModal'));
        if(progressBtn) progressBtn.addEventListener('click', () => openModal('progressModal')); // Could show detailed stats
    }

    function bindSettingsEventListeners() {
        if(themeSelector) themeSelector.addEventListener('change', (e) => updateSetting('theme', e.target.value));
        if(fontSizeSelector) fontSizeSelector.addEventListener('change', (e) => updateSetting('fontSize', e.target.value));
        if(animationsToggle) animationsToggle.addEventListener('change', (e) => updateSetting('animationsEnabled', e.target.checked));
        if(highContrastToggle) highContrastToggle.addEventListener('change', (e) => updateSetting('highContrastEnabled', e.target.checked));
        if(dyslexicFontToggle) dyslexicFontToggle.addEventListener('change', (e) => updateSetting('dyslexicFontEnabled', e.target.checked));
        if(autoSaveToggle) autoSaveToggle.addEventListener('change', (e) => updateSetting('autoSaveProgress', e.target.checked));
        if(showTimerToggle) showTimerToggle.addEventListener('change', (e) => updateSetting('showExerciseTimer', e.target.checked));
        if(showDifficultyToggle) showDifficultyToggle.addEventListener('change', (e) => updateSetting('showDifficultyLevels', e.target.checked));

        if(saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
            saveSettings();
            showToast('Settings saved and applied!', 'success');
            // Consider if settings panel should close or stay open. For now, assume it's a dedicated page.
            // closeModal('settingsPanel'); // If settings is a modal
        });
        if(resetAppSettingsBtn) resetAppSettingsBtn.addEventListener('click', resetSettingsToDefault);
        if(exportUserDataSettingsBtn) exportUserDataSettingsBtn.addEventListener('click', exportAllUserData);
        if(importUserDataSettingsBtn) importUserDataSettingsBtn.addEventListener('click', triggerImportUserData);
    }

    // --- Settings Management ---
    function loadSettings() {
        const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (storedSettings) {
            try {
                const parsed = JSON.parse(storedSettings);
                // Merge carefully to avoid undefined properties overwriting defaults
                appSettings = { ...appSettings, ...parsed };
            } catch (e) {
                console.error("Error parsing stored settings:", e);
                // Fallback to default settings if parsing fails
            }
        }
        // Ensure all default keys are present if a partial setting was stored
        const defaultKeys = Object.keys({
            theme: 'system', fontSize: 'medium', animationsEnabled: true,
            highContrastEnabled: false, dyslexicFontEnabled: false,
            autoSaveProgress: true, showExerciseTimer: true, showDifficultyLevels: true,
        });
        defaultKeys.forEach(key => {
            if (typeof appSettings[key] === 'undefined') {
                appSettings[key] = defaultSettings[key];
            }
        });
    }

    function saveSettings() {
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
        } catch (e) {
            console.error("Error saving settings:", e);
            showToast("Could not save settings. Storage might be full.", "error");
        }
    }

    function updateSetting(key, value) {
        if (appSettings.hasOwnProperty(key)) {
            appSettings[key] = value;
            applySettings(); // Apply immediately
            // No need to save here, saveSettingsBtn will do it or autoSave if implemented
        } else {
            console.warn(`Attempted to update non-existent setting: ${key}`);
        }
    }

    function applySettings() {
        const effectiveTheme = appSettings.theme === 'system' ?
            (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : appSettings.theme;
        document.documentElement.dataset.theme = effectiveTheme;
        if(darkModeToggleBtn) { // If a specific toggle button exists besides the system theme
            darkModeToggleBtn.innerHTML = effectiveTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            darkModeToggleBtn.setAttribute('aria-pressed', String(effectiveTheme === 'dark'));
        }

        document.documentElement.dataset.fontSize = appSettings.fontSize;
        document.documentElement.dataset.animations = appSettings.animationsEnabled ? 'enabled' : 'disabled';
        document.documentElement.dataset.highContrast = appSettings.highContrastEnabled ? 'enabled' : 'disabled';
        document.documentElement.dataset.dyslexicFont = appSettings.dyslexicFontEnabled ? 'enabled' : 'disabled';

        if (difficultyIndicator) {
            difficultyIndicator.style.display = appSettings.showDifficultyLevels && currentActualExercise ? 'flex' : 'none';
        }

        if (appSettings.showExerciseTimer) {
            // Timer logic is handled by start/stopGlobalStudyTimer and individual exercise timer
            if (currentActualExercise && !studyTimerInterval && (currentUIMode === 'student' && studentPanel && !studentPanel.classList.contains('hidden'))) {
                 startGlobalStudyTimer();
            }
        } else {
            stopGlobalStudyTimer();
            // Hide any visible exercise-specific timer UI if it exists
        }
        console.log("Settings applied:", appSettings);
    }

    function updateSettingsUI() { // Call this when settings panel is shown
        if(themeSelector) themeSelector.value = appSettings.theme;
        if(fontSizeSelector) fontSizeSelector.value = appSettings.fontSize;
        if(animationsToggle) animationsToggle.checked = appSettings.animationsEnabled;
        if(highContrastToggle) highContrastToggle.checked = appSettings.highContrastEnabled;
        if(dyslexicFontToggle) dyslexicFontToggle.checked = appSettings.dyslexicFontEnabled;
        if(autoSaveToggle) autoSaveToggle.checked = appSettings.autoSaveProgress;
        if(showTimerToggle) showTimerToggle.checked = appSettings.showExerciseTimer;
        if(showDifficultyToggle) showDifficultyToggle.checked = appSettings.showDifficultyLevels;
    }

    function resetSettingsToDefault() {
        if (confirm("Are you sure you want to reset all settings to their defaults? This will also apply them immediately.")) {
            appSettings = { // Re-initialize with defaults
                theme: 'system', fontSize: 'medium', animationsEnabled: true,
                highContrastEnabled: false, dyslexicFontEnabled: false,
                autoSaveProgress: true, showExerciseTimer: true, showDifficultyLevels: true,
            };
            saveSettings();
            applySettings();
            updateSettingsUI(); // Update the form fields in the settings panel
            showToast("Settings reset to default.", "info");
        }
    }

    // Listen for system theme changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            if (appSettings.theme === 'system') {
                document.documentElement.dataset.theme = event.matches ? 'dark' : 'light';
                 if(darkModeToggleBtn) {
                    darkModeToggleBtn.innerHTML = event.matches ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
                 }
            }
        });
    }

    function toggleDarkMode() { // For a dedicated dark mode toggle button
        let currentEffectiveTheme = document.documentElement.dataset.theme;
        // If current theme is derived from 'system', determine actual light/dark
        if (appSettings.theme === 'system') {
            currentEffectiveTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
        }
        // Toggle and set the theme explicitly (no longer 'system')
        updateSetting('theme', currentEffectiveTheme === 'dark' ? 'light' : 'dark');
        saveSettings(); // Save this explicit choice
        if(themeSelector) themeSelector.value = appSettings.theme; // Update dropdown if it exists
    }


    // --- Study Time Management ---
    function loadStudyTime() {
        const savedTime = localStorage.getItem(STUDY_TIME_STORAGE_KEY);
        totalStudyTime = savedTime ? parseInt(savedTime, 10) : 0;
        if (isNaN(totalStudyTime)) totalStudyTime = 0; // Ensure it's a number
        updateStudyTimeDisplay();
    }

    function saveStudyTime() {
        localStorage.setItem(STUDY_TIME_STORAGE_KEY, totalStudyTime.toString());
    }

    function startGlobalStudyTimer() {
        stopGlobalStudyTimer(); // Clear any existing timer
        if (!appSettings.showExerciseTimer) return; // Respect user setting for global timer display
        studyTimerInterval = setInterval(() => {
            totalStudyTime++;
            updateStudyTimeDisplay();
            if(appSettings.autoSaveProgress && totalStudyTime % 60 === 0) { // Save every minute
                saveStudyTime();
            }
        }, 1000);
    }

    function stopGlobalStudyTimer() {
        clearInterval(studyTimerInterval);
        studyTimerInterval = null;
        if(appSettings.autoSaveProgress) saveStudyTime(); // Save on stop if autoSave is on
    }

    function updateStudyTimeDisplay() {
        if (!statStudyTimeEl) return;
        const hours = Math.floor(totalStudyTime / 3600);
        const minutes = Math.floor((totalStudyTime % 3600) / 60);
        const seconds = totalStudyTime % 60;

        let timeString = "";
        if (hours > 0) {
            timeString = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            timeString = `${minutes}m ${seconds}s`;
        } else {
             timeString = `${seconds}s`;
        }
        statStudyTimeEl.textContent = timeString;
    }


    // --- Student Stats & Streak ---
    function updateStreak() {
        const today = new Date().toISOString().split('T')[0];
        const lastLogin = studentStats.lastLoginDate;

        if (lastLogin === today) {
            // Already logged in today, no change to streak
        } else {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastLogin === yesterdayStr) {
                studentStats.dailyStreak = (studentStats.dailyStreak || 0) + 1;
            } else if (lastLogin && lastLogin < today) { // Logged in before, but not yesterday
                studentStats.dailyStreak = 1; // Reset streak
            } else { // First login or data reset
                studentStats.dailyStreak = 1;
            }
            studentStats.lastLoginDate = today;
            saveStatsToStorage(); // Save updated streak and last login
        }
        if (statStreakEl) statStreakEl.textContent = studentStats.dailyStreak || 0;
    }

    function loadStatsFromStorage() {
        try {
            const storedStats = localStorage.getItem(STATS_STORAGE_KEY);
            if (storedStats) {
                const parsedStats = JSON.parse(storedStats);
                studentStats = {
                    completedExercisesSet: new Set(parsedStats.completedExercisesSet || []),
                    totalScoreSum: Number(parsedStats.totalScoreSum) || 0,
                    totalAttemptsAtCompletion: Number(parsedStats.totalAttemptsAtCompletion) || 0,
                    dailyStreak: Number(parsedStats.dailyStreak) || 0,
                    lastLoginDate: parsedStats.lastLoginDate || null
                };
            } else { // Initialize if no stats found
                studentStats = { completedExercisesSet: new Set(), totalScoreSum: 0, totalAttemptsAtCompletion: 0, dailyStreak: 0, lastLoginDate: null };
            }
        } catch (e) {
            console.error("Error loading stats from storage:", e);
            studentStats = { completedExercisesSet: new Set(), totalScoreSum: 0, totalAttemptsAtCompletion: 0, dailyStreak: 0, lastLoginDate: null };
        }
        updateStudentStatsDisplay();
    }

    function saveStatsToStorage() {
        // Ensure studentStats is a valid object before saving
        if (typeof studentStats !== 'object' || studentStats === null) {
            console.warn("Attempted to save invalid studentStats. Resetting to default.");
            studentStats = { completedExercisesSet: new Set(), totalScoreSum: 0, totalAttemptsAtCompletion: 0, dailyStreak: 0, lastLoginDate: null };
        }
        try {
            const serializableStats = {
                ...studentStats,
                completedExercisesSet: Array.from(studentStats.completedExercisesSet || new Set()) // Convert Set to Array for JSON
            };
            localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(serializableStats));
        } catch (e) {
            console.error("Error saving stats to storage:", e);
            showToast("Could not save student progress. Storage might be full.", "error");
        }
    }

    function updateStudentStatsDisplay() {
        if (!statTotalExercisesEl || !statCompletedExercisesEl || !statAverageScoreEl || !statStreakEl) {
            // console.warn("One or more stat display elements are missing.");
            return;
        }
        // Ensure studentStats and its properties are initialized
        const completedCount = studentStats.completedExercisesSet ? studentStats.completedExercisesSet.size : 0;
        const attempts = studentStats.totalAttemptsAtCompletion || 0;
        const scoreSum = studentStats.totalScoreSum || 0;

        statTotalExercisesEl.textContent = allExercises.length;
        statCompletedExercisesEl.textContent = completedCount;
        const avgScore = attempts > 0 ? Math.round(scoreSum / attempts) : 0;
        statAverageScoreEl.textContent = `${avgScore}%`;
        statStreakEl.textContent = studentStats.dailyStreak || 0;
    }

    function recordExerciseCompletion(exerciseId, scorePercentage) {
        if (!currentActualExercise || !currentActualExercise.id) {
            console.warn("Cannot record completion: No current exercise or exercise ID missing.");
            return;
        }
        if (typeof studentStats !== 'object' || studentStats === null) { // Safety check
            studentStats = { completedExercisesSet: new Set(), totalScoreSum: 0, totalAttemptsAtCompletion: 0, dailyStreak: 0, lastLoginDate: null };
        }
        if (!(studentStats.completedExercisesSet instanceof Set)) { // Ensure it's a Set
            studentStats.completedExercisesSet = new Set(studentStats.completedExercisesSet || []);
        }

        studentStats.completedExercisesSet.add(currentActualExercise.id);
        studentStats.totalScoreSum = (studentStats.totalScoreSum || 0) + scorePercentage;
        studentStats.totalAttemptsAtCompletion = (studentStats.totalAttemptsAtCompletion || 0) + 1;

        saveStatsToStorage();
        updateStudentStatsDisplay();
    }


    // --- UI Mode & Modals ---
function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden'); // This removes display:none
            modal.setAttribute('aria-hidden', 'false');

            // For CSS animations, removing .hidden (which sets display:flex) is often enough.
            // The animation should be defined on the .modal class or .modal-content when it becomes visible.
            // Let's ensure the modalPopup animation is correctly triggered.
            // Force a reflow if needed, though often not necessary if animation is on the modal itself
            // void modal.offsetWidth; // This can sometimes help trigger animations

            const firstFocusable = modal.querySelector(
                'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (firstFocusable) firstFocusable.focus();
        } else {
            console.warn(`Modal with ID "${modalId}" not found.`);
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // To allow an exit animation, you'd typically add a class here
            // that triggers the exit animation, then set display:none on animationend.
            // For simplicity with the current CSS, we'll just hide it directly.
            // If you want exit animations, the CSS and this function need more work.
            modal.classList.add('hidden'); // This sets display:none
            modal.setAttribute('aria-hidden', 'true');
        } else {
             console.warn(`Modal with ID "${modalId}" to close not found.`);
        }
    }

    function switchUIMode(mode) {
        console.log(`Switching UI mode to: ${mode}`);
        const panels = [studentPanel, adminPanel, settingsPanel];
        const buttons = [studentModeBtn, adminModeBtn, settingsBtnHeader];

        panels.forEach(p => p && p.classList.add('hidden'));
        buttons.forEach(b => b && b.classList.remove('active'));

        currentUIMode = mode;

        let previousActiveElement = document.activeElement; // Store focus

        if (mode === 'student') {
            if (studentPanel) studentPanel.classList.remove('hidden');
            if (studentModeBtn) studentModeBtn.classList.add('active');
            if (allExercises.length === 0) {
                 displayNoExercisesMessageStudent();
            } else if (!currentActualExercise && filteredExercises.length > 0) {
                currentExerciseIndexInFiltered = 0;
                currentActualExercise = filteredExercises[currentExerciseIndexInFiltered];
                if(studentExerciseSelector) studentExerciseSelector.value = currentExerciseIndexInFiltered.toString();
                renderCurrentExerciseStudent();
            } else if (currentActualExercise) {
                 renderCurrentExerciseStudent(); // Re-render if needed
            }
            updateStudentStatsDisplay(); // Always update stats on switch to student
            startGlobalStudyTimer();
        } else if (mode === 'admin') {
            stopGlobalStudyTimer();
            const password = prompt("Enter Admin Password:");
            if (password === null) { // User cancelled prompt
                // Revert to the previously visible mode or default to student
                const prevMode = (studentPanel && !studentPanel.classList.contains('hidden')) ? 'student' :
                                 (settingsPanel && !settingsPanel.classList.contains('hidden')) ? 'settings' : 'student';
                switchUIMode(prevMode);
                return;
            }
            if (simpleHash(password) === ADMIN_PASSWORD_HASH) {
                if (adminPanel) adminPanel.classList.remove('hidden');
                if (adminModeBtn) adminModeBtn.classList.add('active');
                updateAdminExerciseListPreview();
            } else {
                alert("Incorrect password. Access denied.");
                // Revert to the previously visible mode or default to student
                const prevModeOnError = (studentPanel && !studentPanel.classList.contains('hidden')) ? 'student' :
                                   (settingsPanel && !settingsPanel.classList.contains('hidden')) ? 'settings' : 'student';
                switchUIMode(prevModeOnError);
            }
        } else if (mode === 'settings') {
            stopGlobalStudyTimer();
            if(settingsPanel) settingsPanel.classList.remove('hidden');
            if(settingsBtnHeader) settingsBtnHeader.classList.add('active');
            updateSettingsUI(); // Ensure settings UI reflects current appSettings
        }

        // Restore focus if possible, or focus panel
        if (previousActiveElement && document.body.contains(previousActiveElement) && previousActiveElement.offsetParent !== null) {
             // Check if still focusable
        } else {
            const activePanel = document.querySelector('#studentPanel:not(.hidden), #adminPanel:not(.hidden), #settingsPanel:not(.hidden)');
            if(activePanel) activePanel.focus(); // Make panel focusable with tabindex="-1" if needed
        }
    }


    // --- Notifications & Utility UI ---
    function showToast(message, type = 'info', duration = 3500) {
        if (!toastNotificationsContainer) {
            console.warn("Toast container not found. Message:", message);
            return;
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`; // e.g., 'info', 'success', 'error', 'warning'
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        let iconClass = 'fas fa-info-circle'; // Default icon
        if (type === 'success') iconClass = 'fas fa-check-circle';
        else if (type === 'error') iconClass = 'fas fa-times-circle';
        else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';

        toast.innerHTML = `<i class="${iconClass}"></i> ${escapeHTML(message)}`;
        toastNotificationsContainer.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove toast after duration
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide'); // Start hide animation
            // Remove from DOM after hide animation finishes
            toast.addEventListener('animationend', () => {
                if(toast.parentNode) toast.parentNode.removeChild(toast);
            });
        }, duration);
    }

    function showInfoModal(title, contentHTML) {
        if (infoModal && infoModalTitle && infoModalContent) {
            infoModalTitle.innerHTML = title; // Assumes title is safe or pre-escaped if dynamic
            infoModalContent.innerHTML = contentHTML; // Assumes contentHTML is safe or pre-sanitized
            openModal('infoModal');
        } else {
            console.warn("Info modal elements not found. Alerting instead.");
            // Fallback to alert if modal elements are missing
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = contentHTML;
            alert(`${title}\n\n${tempDiv.textContent || tempDiv.innerText || ""}`);
        }
    }


    // --- Data Import/Export ---
    function exportAllUserData() {
        const dataToExport = {
            version: "1.1-pro-encapsulated", // Version of the data format
            timestamp: new Date().toISOString(),
            exercises: allExercises,
            linguisticResources: linguisticResources,
            studentStats: {
                ...studentStats,
                completedExercisesSet: Array.from(studentStats.completedExercisesSet || new Set())
            },
            appSettings: appSettings,
            totalStudyTime: totalStudyTime,
            // Add other data like vocabulary, notes, flashcards if implemented
        };

        try {
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `pte_navigator_pro_data_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("User data exported successfully!", "success");
        } catch (error) {
            console.error("Error exporting data:", error);
            showToast(`Export failed: ${error.message}`, "error");
        }
    }

    function triggerImportUserData() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const importedData = JSON.parse(text);

                    if (confirm("Importing data will overwrite existing exercises, progress, and settings. Continue?")) {
                        // Basic validation of imported data structure
                        if (importedData && importedData.exercises !== undefined &&
                            importedData.studentStats !== undefined && importedData.appSettings !== undefined) {

                            allExercises = importedData.exercises || [];
                            linguisticResources = importedData.linguisticResources || null; // Handle if not present

                            // Carefully merge student stats
                            const statsFromFile = importedData.studentStats;
                            studentStats = {
                                ...studentStats, // Keep existing structure as base
                                ...statsFromFile, // Overwrite with imported values
                                completedExercisesSet: new Set(statsFromFile.completedExercisesSet || [])
                            };

                            appSettings = { ...appSettings, ...importedData.appSettings };
                            totalStudyTime = importedData.totalStudyTime || 0;

                            // Save imported data to localStorage
                            localStorage.setItem(EXERCISE_STORAGE_KEY, JSON.stringify(allExercises));
                            localStorage.setItem(LINGUISTIC_RESOURCES_STORAGE_KEY, JSON.stringify(linguisticResources));
                            saveStatsToStorage();
                            saveSettings();
                            saveStudyTime();

                            // Re-apply and update UI
                            applySettings();
                            updateSettingsUI();
                            // loadStatsFromStorage(); // Redundant if studentStats is directly updated
                            updateStudentStatsDisplay();
                            // loadStudyTime(); // Redundant
                            updateStudyTimeDisplay();
                            updateStreak();
                            applyExerciseFilterAndRender(); // Refresh student exercise view
                            updateAdminExerciseListPreview(); // Refresh admin view

                            showToast("Data imported successfully! Application refreshed.", "success");
                        } else {
                            showToast("Import failed: Invalid or incomplete data structure in file.", "error");
                        }
                    }
                } catch (err) {
                    console.error("Error importing data:", err);
                    showToast(`Import failed: ${err.message}. Ensure it's a valid JSON file.`, "error");
                }
            }
            // Clean up the dynamically created file input
            if(fileInput.parentNode) fileInput.parentNode.removeChild(fileInput);
        };
        // Append to body, click, and then remove to handle potential security restrictions
        document.body.appendChild(fileInput);
        fileInput.click();
        // No, don't remove immediately, wait for onchange. Removed it inside onchange.
    }


    // --- Admin Panel Specific Functions ---
    function handleAdminDragOver(event) {
        event.preventDefault(); // Necessary to allow drop
        if (adminUploadArea) adminUploadArea.classList.add('dragover');
    }
    function handleAdminDragLeave() {
        if (adminUploadArea) adminUploadArea.classList.remove('dragover');
    }
    function handleAdminDrop(event) {
        event.preventDefault();
        if (adminUploadArea) adminUploadArea.classList.remove('dragover');
        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            processAdminFile(files[0]);
        } else {
            showToast("No files dropped.", "warning");
        }
    }
    function handleAdminFileSelect(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            processAdminFile(files[0]);
        }
    }

    function processAdminFile(file) {
        if (!adminUploadStatusEl) return;
        adminUploadStatusEl.textContent = 'Processing...';
        adminUploadStatusEl.className = 'feedback-message loading'; // CSS for styling

        if (!file || file.type !== "application/json") {
            adminUploadStatusEl.textContent = "Invalid file: Please upload a single .json file.";
            adminUploadStatusEl.className = 'feedback-message error';
            if (adminFileInput) adminFileInput.value = ''; // Reset file input
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const fileContent = e.target.result;
                const parsedData = JSON.parse(fileContent);

                // Validate top-level structure (expecting an array of exercises, or a structure with resources)
                if (!Array.isArray(parsedData) && !(parsedData.exercises && Array.isArray(parsedData.exercises))) {
                     throw new Error("Uploaded JSON is not an array of exercises or a valid data structure with an 'exercises' array.");
                }

                let exercisesToStore = [];
                let resourcesToStore = null;

                // Handle two possible formats:
                // 1. Direct array of exercises (old format, where resources might be in first ex)
                // 2. Object { linguistic_resources: {}, exercises: [] } (newer, cleaner format)
                if (Array.isArray(parsedData)) { // Old format
                    console.warn("Processing older format JSON (direct array). Consider updating to {linguistic_resources, exercises} structure.");
                    if (parsedData.length > 0 && parsedData[0].linguistic_resources) {
                        resourcesToStore = parsedData[0].linguistic_resources;
                        exercisesToStore = parsedData.map(ex => {
                            const { linguistic_resources, ...exerciseWithoutResources } = ex;
                            return exerciseWithoutResources;
                        });
                    } else {
                        exercisesToStore = parsedData;
                    }
                } else if (parsedData.exercises) { // Newer format
                    exercisesToStore = parsedData.exercises;
                    resourcesToStore = parsedData.linguistic_resources || null;
                }


                if (exercisesToStore.length > 0) {
                    const firstEx = exercisesToStore[0];
                    if (!firstEx.id || !firstEx.title || !firstEx.exerciseType || !firstEx.rawPassage || !Array.isArray(firstEx.blanks)) {
                         throw new Error("First exercise in JSON is missing required fields (id, title, exerciseType, rawPassage, blanks array). Please check file format.");
                    }
                }

                localStorage.setItem(EXERCISE_STORAGE_KEY, JSON.stringify(exercisesToStore));
                if (resourcesToStore) {
                    localStorage.setItem(LINGUISTIC_RESOURCES_STORAGE_KEY, JSON.stringify(resourcesToStore));
                } else {
                    localStorage.removeItem(LINGUISTIC_RESOURCES_STORAGE_KEY); // Clear if not provided
                }

                adminUploadStatusEl.textContent = `Success: ${exercisesToStore.length} exercises loaded. Linguistic resources ${resourcesToStore ? 'updated' : 'cleared/not found'}.`;
                adminUploadStatusEl.className = 'feedback-message success';

                loadExercisesAndResourcesFromStorage(); // Reload all data
                updateAdminExerciseListPreview();

                if (currentUIMode === 'student') { // If student is viewing, refresh their list
                    applyExerciseFilterAndRender();
                }
                showToast("Exercises and resources updated.", "success");

            } catch (error) {
                console.error("Error processing admin JSON file:", error);
                adminUploadStatusEl.textContent = `Error: ${error.message}. File not saved.`;
                adminUploadStatusEl.className = 'feedback-message error';
            } finally {
                if (adminFileInput) adminFileInput.value = ''; // Reset file input
            }
        };
        reader.onerror = function() {
            adminUploadStatusEl.textContent = "Error reading file.";
            adminUploadStatusEl.className = 'feedback-message error';
            if (adminFileInput) adminFileInput.value = '';
        };
        reader.readAsText(file);
    }

    function updateAdminExerciseListPreview() {
        if (!adminExerciseListPreviewEl) return;
        adminExerciseListPreviewEl.innerHTML = ''; // Clear previous list

        if (allExercises.length > 0) {
            const list = document.createElement('ul');
            list.className = 'admin-exercise-preview-list';
            allExercises.forEach((ex, index) => {
                const listItem = document.createElement('li');
                listItem.className = 'exercise-item'; // For styling
                listItem.innerHTML = `
                    <h4>${escapeHTML(ex.title) || `Exercise ${index + 1}`} (ID: ${escapeHTML(ex.id)})</h4>
                    <p><strong>Type:</strong> ${escapeHTML(ex.exerciseType || 'N/A')}, <strong>Blanks:</strong> ${ex.blanks ? ex.blanks.length : 0}</p>
                    <button class="btn btn-small btn-edit-exercise" data-exercise-id="${ex.id}" aria-label="Edit exercise ${escapeHTML(ex.title)}"><i class="fas fa-edit"></i> Edit</button>
                    <!-- Add delete button here if needed -->
                `;
                list.appendChild(listItem);
            });
            adminExerciseListPreviewEl.appendChild(list);

            // Add event listeners for edit buttons (if edit functionality exists)
            adminExerciseListPreviewEl.querySelectorAll('.btn-edit-exercise').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const exerciseId = e.currentTarget.dataset.exerciseId;
                    showToast(`Edit functionality for exercise ID ${exerciseId} is not yet implemented.`, 'info');
                    // Example: openEditExerciseModal(exerciseId);
                });
            });
        } else {
            adminExerciseListPreviewEl.innerHTML = '<p class="empty-list-message">No exercises currently stored. Upload a JSON file.</p>';
        }
    }

    function clearAllStoredDataAdmin() {
        if (confirm("DANGER ZONE!\nAre you sure you want to clear ALL stored exercises, linguistic resources, student stats, settings, and study time? This action CANNOT be undone.")) {
            try {
                // Clear all known storage keys
                localStorage.removeItem(EXERCISE_STORAGE_KEY);
                localStorage.removeItem(LINGUISTIC_RESOURCES_STORAGE_KEY);
                localStorage.removeItem(STATS_STORAGE_KEY);
                localStorage.removeItem(STUDY_TIME_STORAGE_KEY);
                localStorage.removeItem(SETTINGS_STORAGE_KEY);
                // Clear any other app-specific keys if they exist
                // localStorage.removeItem(VOCABULARY_STORAGE_KEY);
                // localStorage.removeItem(NOTES_STORAGE_KEY);
                // localStorage.removeItem(FLASHCARDS_STORAGE_KEY);

            } catch (e) {
                console.error("Error clearing localStorage:", e);
                showToast("Error clearing some data. Manual cleanup might be needed via browser dev tools.", "error");
            }

            // Reset all in-memory state
            allExercises = [];
            linguisticResources = null;
            filteredExercises = [];
            currentActualExercise = null;
            currentExerciseIndexInFiltered = -1;
            userAnswers = {};
            userConfidence = {};

            // Reset stats
            studentStats = { completedExercisesSet: new Set(), totalScoreSum: 0, totalAttemptsAtCompletion: 0, dailyStreak: 0, lastLoginDate: null };
            totalStudyTime = 0;

            // Reset settings to default
            appSettings = {
                theme: 'system', fontSize: 'medium', animationsEnabled: true,
                highContrastEnabled: false, dyslexicFontEnabled: false,
                autoSaveProgress: true, showExerciseTimer: true, showDifficultyLevels: true,
            };
            applySettings(); // Apply new default settings
            updateSettingsUI(); // Update settings panel UI

            if (adminUploadStatusEl) {
                adminUploadStatusEl.textContent = "All application data has been cleared.";
                adminUploadStatusEl.className = 'feedback-message success';
            }
            updateAdminExerciseListPreview(); // Clear admin list

            // Update student UI if currently active
            if (currentUIMode === 'student') {
                displayNoExercisesMessageStudent();
                updateStudentStatsDisplay();
                updateStudyTimeDisplay();
                updateStreak(); // Will reset streak to 1 for "today"
                populateStudentExerciseSelector();
            }
            showToast("All application data cleared successfully!", "success");
            console.log("All application data has been cleared by admin.");
        }
    }


    // --- Exercise Loading & Filtering (Student Panel) ---
    function loadExercisesAndResourcesFromStorage() {
        try {
            const resourcesJSON = localStorage.getItem(LINGUISTIC_RESOURCES_STORAGE_KEY);
            linguisticResources = resourcesJSON ? JSON.parse(resourcesJSON) : null;

            const exercisesJSON = localStorage.getItem(EXERCISE_STORAGE_KEY);
            if (exercisesJSON) {
                allExercises = JSON.parse(exercisesJSON);
                if (!Array.isArray(allExercises)) { // Basic validation
                    console.error("Stored exercises data is not an array. Resetting.", allExercises);
                    allExercises = [];
                }
                // Legacy check: if global resources were stored within the first exercise
                if (!linguisticResources && allExercises.length > 0 && allExercises[0]?.linguistic_resources) {
                    console.warn("Found linguistic resources in the first exercise (legacy). Moving to global store.");
                    linguisticResources = allExercises[0].linguistic_resources;
                    allExercises = allExercises.map(ex => {
                        const { linguistic_resources, ...rest } = ex;
                        return rest;
                    });
                    if (linguisticResources) {
                         try { localStorage.setItem(LINGUISTIC_RESOURCES_STORAGE_KEY, JSON.stringify(linguisticResources)); }
                         catch (e) { console.error("Failed to save extracted global resources:", e); }
                    }
                }
            } else {
                allExercises = [];
            }
        } catch (e) {
            console.error("Error loading exercises/resources from localStorage:", e);
            allExercises = [];
            linguisticResources = null;
            showToast("Error loading exercise data. Data might be corrupted.", "error");
        }
        // Initial filter and render based on loaded data
        filterExercisesBySearch(); // This will also populate selector and render first/current exercise
    }

    function filterExercisesBySearch() {
        const searchTerm = exerciseSearchInput ? exerciseSearchInput.value.toLowerCase().trim() : "";
        let baseFilteredByType = [];
        const typeFilter = currentExerciseTypeFilter || 'all';

        if (typeFilter === 'all') {
            baseFilteredByType = [...allExercises];
        } else {
            baseFilteredByType = allExercises.filter(ex => ex.exerciseType === typeFilter);
        }

        if (!searchTerm) {
            filteredExercises = baseFilteredByType;
        } else {
            filteredExercises = baseFilteredByType.filter(ex =>
                (ex.title && ex.title.toLowerCase().includes(searchTerm)) ||
                (ex.id && ex.id.toLowerCase().includes(searchTerm)) // Allow search by ID
            );
        }

        populateStudentExerciseSelector(); // Update dropdown

        if (filteredExercises.length > 0) {
            let newSelectionIndex = 0; // Default to first
            // Try to maintain current exercise if it's still in the filtered list
            if(currentActualExercise) {
                const idxInNewFilter = filteredExercises.findIndex(ex => ex.id === currentActualExercise.id);
                if(idxInNewFilter !== -1) newSelectionIndex = idxInNewFilter;
            }
            currentExerciseIndexInFiltered = newSelectionIndex;
            currentActualExercise = filteredExercises[currentExerciseIndexInFiltered];
            if (studentExerciseSelector) studentExerciseSelector.value = currentExerciseIndexInFiltered.toString();
            renderCurrentExerciseStudent();
        } else {
            currentActualExercise = null;
            currentExerciseIndexInFiltered = -1;
            displayNoExercisesMessageStudent();
        }
        updateStudentStatsDisplay(); // Update stats based on total exercises
    }

    function applyExerciseFilterAndRender() {
        // This is primarily called by type filter buttons. It re-runs the search with the new type.
        filterExercisesBySearch();
    }

    function populateStudentExerciseSelector() {
        if (!studentExerciseSelector) return;
        const previouslySelectedValue = studentExerciseSelector.value; // String

        studentExerciseSelector.innerHTML = ''; // Clear options

        if (filteredExercises.length > 0) {
            filteredExercises.forEach((ex, index) => {
                const option = document.createElement('option');
                option.value = index.toString(); // Value is the index in filteredExercises
                option.textContent = escapeHTML(ex.title || `Untitled Exercise ${index + 1}`);
                studentExerciseSelector.appendChild(option);
            });
            studentExerciseSelector.disabled = false;

            // Try to restore selection
            if (currentExerciseIndexInFiltered >= 0 && currentExerciseIndexInFiltered < filteredExercises.length) {
                 studentExerciseSelector.value = currentExerciseIndexInFiltered.toString();
            } else if (filteredExercises.some( (ex,idx) => idx.toString() === previouslySelectedValue)) {
                studentExerciseSelector.value = previouslySelectedValue;
                currentExerciseIndexInFiltered = parseInt(previouslySelectedValue, 10);
                currentActualExercise = filteredExercises[currentExerciseIndexInFiltered]; // Should already be set by filterExercisesBySearch
            } else { // Default to first if previous selection is gone
                 studentExerciseSelector.value = "0";
                 currentExerciseIndexInFiltered = 0;
                 currentActualExercise = filteredExercises[0];
            }
        } else {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = (exerciseSearchInput && exerciseSearchInput.value.trim()) ? "No exercises match search/filter" : "No exercises for this type";
            studentExerciseSelector.appendChild(option);
            studentExerciseSelector.disabled = true;
        }
    }

    function loadSelectedExerciseFromDropdown() {
        if (!studentExerciseSelector) return;
        const selectedIndex = parseInt(studentExerciseSelector.value, 10);

        if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < filteredExercises.length) {
            if (currentExerciseIndexInFiltered !== selectedIndex || !currentActualExercise) {
                currentExerciseIndexInFiltered = selectedIndex;
                currentActualExercise = filteredExercises[currentExerciseIndexInFiltered];
                userAnswers = {}; // Reset for new exercise
                userConfidence = {};
                renderCurrentExerciseStudent();
            }
        } else if (filteredExercises.length > 0) { // Fallback if selectedIndex is invalid but list not empty
            console.warn("Invalid index from dropdown, loading first available exercise.");
            currentExerciseIndexInFiltered = 0;
            currentActualExercise = filteredExercises[0];
            if(studentExerciseSelector) studentExerciseSelector.value = "0";
            userAnswers = {};
            userConfidence = {};
            renderCurrentExerciseStudent();
        } else {
            displayNoExercisesMessageStudent(); // No exercises available at all
        }
    }

    function loadPreviousExercise() {
        if (filteredExercises.length === 0) { displayNoExercisesMessageStudent(); return; }
        currentExerciseIndexInFiltered--;
        if (currentExerciseIndexInFiltered < 0) {
            currentExerciseIndexInFiltered = filteredExercises.length - 1; // Wrap around
        }
        currentActualExercise = filteredExercises[currentExerciseIndexInFiltered];
        if(studentExerciseSelector) studentExerciseSelector.value = currentExerciseIndexInFiltered.toString();
        userAnswers = {};
        userConfidence = {};
        renderCurrentExerciseStudent();
    }

    function loadNextExercise() {
        if (filteredExercises.length === 0) { displayNoExercisesMessageStudent(); return; }
        currentExerciseIndexInFiltered = (currentExerciseIndexInFiltered + 1) % filteredExercises.length; // Wrap around
        currentActualExercise = filteredExercises[currentExerciseIndexInFiltered];
        if(studentExerciseSelector) studentExerciseSelector.value = currentExerciseIndexInFiltered.toString();
        userAnswers = {};
        userConfidence = {};
        renderCurrentExerciseStudent();
    }

    function getAIRecommendedExercise() {
        if (filteredExercises.length === 0) {
            showToast("No exercises available to recommend.", "warning");
            return;
        }

        // "AI" logic: prefer uncompleted, then random. Could be much more complex.
        let uncompleted = filteredExercises.filter(ex => studentStats.completedExercisesSet && !studentStats.completedExercisesSet.has(ex.id));
        let choice;

        if (uncompleted.length > 0) {
            choice = uncompleted[Math.floor(Math.random() * uncompleted.length)];
        } else { // All filtered exercises completed, or no completion data
            choice = filteredExercises[Math.floor(Math.random() * filteredExercises.length)];
        }

        const newIndex = filteredExercises.findIndex(ex => ex.id === choice.id);
        if (newIndex !== -1) {
            currentExerciseIndexInFiltered = newIndex;
            currentActualExercise = filteredExercises[currentExerciseIndexInFiltered];
            if (studentExerciseSelector) studentExerciseSelector.value = currentExerciseIndexInFiltered.toString();
            userAnswers = {};
            userConfidence = {};
            renderCurrentExerciseStudent();
            showToast(`AI Recommends: "${escapeHTML(currentActualExercise.title)}"`, "info");
        } else {
             showToast("Could not find a suitable exercise to recommend.", "warning");
        }
    }

    function displayNoExercisesMessageStudent() {
        currentActualExercise = null; // Ensure no exercise is considered active
        if(currentExerciseTitleEl) currentExerciseTitleEl.textContent = "No Exercise Available";
        if(passageContainer) {
            passageContainer.innerHTML = `<div class="empty-exercise-message">
                <p>No exercises match the current filter or search criteria. Please try adjusting your selection, or use Admin Mode to upload more exercises.</p>
            </div>`;
        }
        if(dndOptionsContainer) {
            dndOptionsContainer.innerHTML = '';
            dndOptionsContainer.style.display = 'none';
        }
        if(feedbackSection) feedbackSection.innerHTML = '';
        if(scoreDisplayEl) scoreDisplayEl.classList.add('hidden');
        // Disable most action buttons
        disableStudentActionButtons(true, true, true, true, true);
        if (difficultyIndicator) difficultyIndicator.style.display = 'none';
    }


    // --- Exercise Rendering & Interaction (Student Panel) ---
    function renderCurrentExerciseStudent() {
        if (!currentActualExercise || !passageContainer) {
            displayNoExercisesMessageStudent();
            return;
        }

        // Reset UI elements for the new exercise
        if(feedbackSection) feedbackSection.innerHTML = '';
        if(scoreDisplayEl) scoreDisplayEl.classList.add('hidden');
        if(currentExerciseTitleEl) currentExerciseTitleEl.textContent = escapeHTML(currentActualExercise.title || `Exercise`);

        startIndividualExerciseTimer(); // Start timer for this specific exercise attempt

        // Difficulty Indicator
        if (difficultyIndicator && difficultyLevelText && appSettings.showDifficultyLevels) {
            const difficulty = currentActualExercise.difficulty || 'Medium'; // Default if not specified
            difficultyLevelText.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
            difficultyIndicator.className = 'difficulty-indicator'; // Reset classes
            difficultyIndicator.classList.add(difficulty.toLowerCase()); // e.g., 'easy', 'medium', 'hard'
            difficultyIndicator.style.display = 'flex';
        } else if (difficultyIndicator) {
            difficultyIndicator.style.display = 'none';
        }

        let passageTextForProcessing = currentActualExercise.rawPassage;
        let passageHTML = "";

        // Part-of-Speech (POS) Tagging with Compromise.js (if active and library loaded)
        if (isPosDisplayActive && typeof compromise !== 'undefined') {
            passageContainer.classList.add('pos-active');
            try {
                let doc = compromise(passageTextForProcessing);
                let currentPosInRawText = 0;
                doc.terms().forEach(term => {
                    const termText = term.text();
                    const originalIndex = passageTextForProcessing.indexOf(termText, currentPosInRawText);

                    if (originalIndex > currentPosInRawText) { // Text between last term and this one
                        passageHTML += escapeHTML(passageTextForProcessing.substring(currentPosInRawText, originalIndex));
                    }
                    if (/\w/.test(termText) && termText.length > 0) { // Process actual words
                        let tags = term.tags.length > 0 ? Array.from(term.tags).join(', ') : 'Term';
                        tags = simplifyPosTags(tags); // Simplify for display
                        passageHTML += `<span class="word-pos-interactive" tabindex="0" role="button" aria-label="Part of speech for ${escapeHTML(termText)} is ${escapeHTML(tags)}">${escapeHTML(termText)}<span class="pos-tooltip">${escapeHTML(tags)}</span></span>`;
                    } else { // Punctuation, spaces handled as is
                        passageHTML += escapeHTML(termText);
                    }
                    currentPosInRawText = originalIndex + termText.length;
                });
                // Append any remaining text after the last term
                if (currentPosInRawText < passageTextForProcessing.length) {
                    passageHTML += escapeHTML(passageTextForProcessing.substring(currentPosInRawText));
                }
            } catch (e) {
                console.error("Error during POS tagging with compromise:", e);
                showToast("POS tagging library (compromise.js) might not be loaded or an error occurred.", "warning");
                passageHTML = escapeHTML(passageTextForProcessing); // Fallback to non-POS display
                passageContainer.classList.remove('pos-active'); // Ensure class is removed on error
            }
        } else {
            passageContainer.classList.remove('pos-active');
            passageHTML = escapeHTML(passageTextForProcessing);
        }

        // Create placeholders for blanks before clue highlighting to avoid messing with indices
        const blankPlaceholders = [];
        (currentActualExercise.blanks || []).forEach((blankData, i) => {
            const placeholder = `__BLANK_PH_${i}__`;
            blankPlaceholders.push(placeholder);
            // Replace only the first '_______' to handle multiple blanks correctly
            passageHTML = replaceFirstOccurrence(passageHTML, '_______', placeholder);
        });

        // Passage Clue Highlighting
        let allCluePhrasesForExercise = [];
        if (currentActualExercise.analysis_and_hints?.passage_highlight_phrases) {
            allCluePhrasesForExercise = [...currentActualExercise.analysis_and_hints.passage_highlight_phrases];
        } else { // Fallback to individual blank hints if global not present
             (currentActualExercise.blanks || []).forEach(blank => {
                if (blank.analysis_and_hints?.passage_highlight_phrases) {
                    allCluePhrasesForExercise.push(...blank.analysis_and_hints.passage_highlight_phrases);
                }
            });
        }
        // Filter out empty phrases, remove duplicates, and sort by length (longest first for better matching)
        allCluePhrasesForExercise = [...new Set(allCluePhrasesForExercise.filter(p => p && p.trim() !== ""))]
                                    .sort((a,b) => b.length - a.length);

        allCluePhrasesForExercise.forEach(phrase => {
            try {
                const escapedPhrase = escapeRegExp(phrase);
                // Regex to match phrase only if not inside HTML tags or attributes
                const regex = new RegExp(`(?<!<[^>]*?)(?<!=['"])(` + escapedPhrase + `)(?![^<]*?>)(?!['"])`, 'gi');
                passageHTML = passageHTML.replace(regex, (match, capturedPhrase) => {
                    // Avoid re-wrapping if already wrapped (e.g., by POS tagger)
                    if (capturedPhrase.includes("<span")) return match;
                    return `<span class="passage-clue-highlight">${capturedPhrase}</span>`;
                });
            } catch (e) {
                console.warn(`Could not create RegExp for clue phrase: "${phrase}". Error: ${e.message}`);
            }
        });

        // Insert blank inputs (dropdowns or DND dropzones)
        (currentActualExercise.blanks || []).forEach((blankData, i) => {
            let blankInputHTML = '';
            let blankPosHintTooltipHTML = '';

            if (isPosDisplayActive) {
                const expectedPosRaw = blankData.analysis_and_hints?.pos_tag_correct_answer;
                let expectedPosDisplay = 'Word'; // Default
                if(expectedPosRaw) {
                    expectedPosDisplay = simplifyPosTags(expectedPosRaw);
                } else if (currentActualExercise.exerciseType === 'FIB_RW') {
                    expectedPosDisplay = 'Select'; // Generic for dropdowns
                }
                blankPosHintTooltipHTML = `<span class="blank-pos-hint-tooltip">${escapeHTML(expectedPosDisplay)}</span>`;
            }

            if (currentActualExercise.exerciseType === 'FIB_RW') { // Fill In Blanks - Reading & Writing
                let optionsHTML = `<option value="">Select...</option>`;
                if (Array.isArray(blankData.options_fib_rw)) {
                    blankData.options_fib_rw.forEach(opt => {
                        let optionText = escapeHTML(opt);
                        if (isPosDisplayActive && typeof compromise !== 'undefined') { // Add POS to options if active
                            let tags = 'Word';
                            try {
                                let doc = compromise(opt);
                                if (doc.terms().length > 0) {
                                    tags = doc.terms().first().tags().length > 0 ? Array.from(doc.terms().first().tags()).join(', ') : 'Word';
                                    tags = simplifyPosTags(tags);
                                }
                            } catch (e) { console.warn("Compromise error on FIB_RW option:", opt, e); }
                            optionText = `${escapeHTML(opt)} (${escapeHTML(tags)})`;
                        }
                        optionsHTML += `<option value="${escapeHTML(opt)}">${optionText}</option>`;
                    });
                }
                blankInputHTML = `<select class="fib-dropdown" data-blank-index="${i}" aria-label="Answer for blank ${i+1}">${optionsHTML}</select>${blankPosHintTooltipHTML}`;
            } else if (currentActualExercise.exerciseType === 'DND') { // Drag and Drop
                blankInputHTML = `<span class="blank dropzone" data-blank-index="${i}" data-correct-answer="${escapeHTML(blankData.correct_answer)}" aria-label="Drop area for blank ${i+1}" role="region" title="Drop a word here" tabindex="0">&nbsp;</span>${blankPosHintTooltipHTML}`;
            }
            passageHTML = replaceFirstOccurrence(passageHTML, blankPlaceholders[i], `<span class="blank-wrapper" data-blank-index="${i}">${blankInputHTML}</span>`);
        });

        passageContainer.innerHTML = passageHTML.replace(/\n/g, "<br>"); // Render newlines as breaks

        // Setup DND options if it's a DND exercise
        if (currentActualExercise.exerciseType === 'DND' && currentActualExercise.draggable_options_dnd) {
            if (dndOptionsContainer) {
                dndOptionsContainer.innerHTML = ''; // Clear old options
                currentActualExercise.draggable_options_dnd.forEach(opt => {
                    const draggable = document.createElement('div');
                    draggable.className = 'draggable-word';
                    let draggableContent;
                    if (isPosDisplayActive && typeof compromise !== 'undefined') {
                        let tags = 'Word';
                        try {
                            let doc = compromise(opt);
                            if (doc.terms().length > 0) {
                               tags = doc.terms().first().tags().length > 0 ? Array.from(doc.terms().first().tags()).join(', ') : 'Word';
                               tags = simplifyPosTags(tags);
                            }
                        } catch(e) { console.warn("Compromise error on DND option:", opt, e); }
                        draggableContent = `<span class="word-pos-interactive" tabindex="0" role="button">${escapeHTML(opt)}<span class="pos-tooltip">${escapeHTML(tags)}</span></span>`;
                    } else {
                        draggableContent = escapeHTML(opt);
                    }
                    draggable.innerHTML = draggableContent;
                    draggable.draggable = true;
                    // Create a more robust ID for DND items
                    draggable.id = `dnd-opt-${encodeURIComponent(opt).replace(/[^a-zA-Z0-9-_]/g, '')}-${Math.random().toString(36).substring(2, 9)}`;
                    draggable.dataset.dndWord = opt; // Store original word
                    draggable.addEventListener('dragstart', handleDNDDragStart);
                    dndOptionsContainer.appendChild(draggable);
                });
                dndOptionsContainer.style.display = 'flex';
            }
        } else {
            if (dndOptionsContainer) dndOptionsContainer.style.display = 'none';
        }

        // Add event listeners to newly rendered interactive elements
        if (passageContainer) {
            passageContainer.querySelectorAll('.fib-dropdown').forEach(dropdown => {
                dropdown.addEventListener('change', (event) => {
                    const blankIndex = parseInt(event.target.dataset.blankIndex, 10);
                    userAnswers[blankIndex] = event.target.value;
                    // Clear previous feedback styling on change
                    event.target.classList.remove('correct', 'incorrect', 'unanswered');
                    if (feedbackSection) feedbackSection.innerHTML = ''; // Clear feedback on new answer
                    if (scoreDisplayEl) scoreDisplayEl.classList.add('hidden');
                    if (submitAnswersBtn) submitAnswersBtn.disabled = false; // Enable submit
                });
            });
            passageContainer.querySelectorAll('.dropzone').forEach(dz => {
                dz.addEventListener('dragover', handleDNDDragOverZone);
                dz.addEventListener('dragleave', handleDNDDragLeaveZone);
                dz.addEventListener('drop', handleDNDDropInZone);
                dz.addEventListener('click', handleDropzoneClickToRemove); // Allow click to remove
                dz.addEventListener('keydown', (e) => { // Keyboard accessibility for dropzones
                    if (e.key === 'Enter' || e.key === ' ') {
                        handleDropzoneClickToRemove(e); // Simulate click for removal
                    }
                });
            });
        }

        // Reset hints button state
        if (getInitialHintsBtn) {
            const clueBtnTextSpan = getInitialHintsBtn.querySelector('.btn-text');
            const defaultClueText = 'Show Clues';
            if(clueBtnTextSpan) {
                clueBtnTextSpan.textContent = defaultClueText;
            } else { // Fallback if .btn-text span is not found (less ideal)
                const textNode = Array.from(getInitialHintsBtn.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
                if (textNode) textNode.nodeValue = ` ${defaultClueText}`; // Note: space might be needed depending on icon
            }
            getInitialHintsBtn.classList.remove('active');
            getInitialHintsBtn.setAttribute('aria-pressed', 'false');
            getInitialHintsBtn.disabled = !(allCluePhrasesForExercise.length > 0); // Disable if no clues
        }
        // Ensure clue highlights are not emphasized initially
        if (passageContainer) {
            passageContainer.querySelectorAll('.passage-clue-highlight.extra-emphasis').forEach(el => el.classList.remove('extra-emphasis'));
        }

        // Update student action buttons state
        const canNavigate = filteredExercises.length > 1;
        const hasAnyAnswers = Object.values(userAnswers).some(ans => ans && ans.trim() !== "");
        const allBlanksEmpty = Object.keys(userAnswers).length === 0 || Object.values(userAnswers).every(val => !val || val.trim() === "");

        disableStudentActionButtons(
            allBlanksEmpty, /* submit */
            allBlanksEmpty, /* reset */
            !canNavigate,  /* prev */
            !canNavigate,  /* next */
            !(allCluePhrasesForExercise.length > 0) /* hints */
        );
    }

    function disableStudentActionButtons(submit, reset, prev, next, hints) {
        if (submitAnswersBtn) submitAnswersBtn.disabled = submit;
        if (resetExerciseBtn) resetExerciseBtn.disabled = reset;
        if (prevExerciseBtn) prevExerciseBtn.disabled = prev;
        if (nextExerciseBtn) nextExerciseBtn.disabled = next;
        if (getInitialHintsBtn) getInitialHintsBtn.disabled = hints;
    }

    function resetCurrentExercise() {
        if (confirm("Are you sure you want to reset your answers for this exercise?")) {
            if (currentActualExercise) {
                userAnswers = {}; // Clear all answers for this exercise
                userConfidence = {}; // Clear confidence
                renderCurrentExerciseStudent(); // Re-render the exercise (will clear inputs)
                // submitAnswersBtn should be disabled by renderCurrentExerciseStudent if no answers
            }
        }
    }

    function togglePassageClueEmphasis() {
        if (!currentActualExercise || !passageContainer || !getInitialHintsBtn) return;
        const clues = passageContainer.querySelectorAll('.passage-clue-highlight');

        if (clues.length === 0) {
            showToast("No passage clues available for this exercise.", "info");
            return;
        }

        let isCurrentlyEmphasized = getInitialHintsBtn.classList.contains('active');
        clues.forEach(clue => clue.classList.toggle('extra-emphasis', !isCurrentlyEmphasized));
        getInitialHintsBtn.classList.toggle('active', !isCurrentlyEmphasized);

        const clueBtnTextSpan = getInitialHintsBtn.querySelector('.btn-text');
        const newText = !isCurrentlyEmphasized ? 'Hide Emphasis' : 'Show Clues';
        if(clueBtnTextSpan) {
            clueBtnTextSpan.textContent = newText;
        } else {
            const textNode = Array.from(getInitialHintsBtn.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
            if (textNode) textNode.nodeValue = ` ${newText}`;
        }
        getInitialHintsBtn.setAttribute('aria-pressed', String(!isCurrentlyEmphasized));
    }

    function togglePosDisplay() {
        isPosDisplayActive = !isPosDisplayActive;
        if (togglePosBtn) {
            const btnTextSpan = togglePosBtn.querySelector('.btn-text');
            const newText = isPosDisplayActive ? 'Hide POS' : 'Show POS';
            if (btnTextSpan) {
                btnTextSpan.textContent = newText;
            } else { // Fallback
                 const textNode = Array.from(togglePosBtn.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
                 if(textNode) textNode.nodeValue = ` ${newText}`;
            }
            togglePosBtn.classList.toggle('active', isPosDisplayActive);
            togglePosBtn.setAttribute('aria-pressed', isPosDisplayActive.toString());
        }

        // To re-render the exercise with/without POS, we need to save current answers
        const savedAnswersTemp = { ...userAnswers }; // Shallow copy is fine for string values
        const savedDndOriginalIds = {}; // For DND, to re-link dragged items

        if (currentActualExercise && passageContainer) {
            // If DND, get the original draggable IDs from filled dropzones
            if (currentActualExercise.exerciseType === 'DND') {
                passageContainer.querySelectorAll('.dropzone.filled[data-original-draggable-id]').forEach(dz => {
                    const blankIdx = parseInt(dz.dataset.blankIndex, 10);
                    savedDndOriginalIds[blankIdx] = dz.dataset.originalDraggableId;
                });
            }

            renderCurrentExerciseStudent(); // This clears userAnswers, so we restore them below

            // Restore answers
            userAnswers = { ...savedAnswersTemp }; // Restore answers
            currentActualExercise.blanks.forEach((blank, idx) => {
                const answer = userAnswers[idx];
                if (answer) {
                    if (currentActualExercise.exerciseType === 'FIB_RW') {
                        const dropdown = passageContainer.querySelector(`.fib-dropdown[data-blank-index="${idx}"]`);
                        if (dropdown) dropdown.value = answer;
                    } else if (currentActualExercise.exerciseType === 'DND') {
                        const dropzone = passageContainer.querySelector(`.dropzone[data-blank-index="${idx}"]`);
                        const originalDraggableId = savedDndOriginalIds[idx];
                        const originalDraggable = originalDraggableId ? document.getElementById(originalDraggableId) : null;

                        if (dropzone && originalDraggable) {
                            dropzone.textContent = answer; // The word itself
                            dropzone.classList.add('filled');
                            dropzone.dataset.originalDraggableId = originalDraggableId;
                            dropzone.setAttribute('title', 'Click to remove this word');
                            originalDraggable.style.display = 'none'; // Hide from options
                        } else if (dropzone && answer) { // Fallback if originalDraggable not found, just put text
                            console.warn(`DND item for blank ${idx} could not be fully restored after POS toggle.`);
                            dropzone.textContent = answer;
                            dropzone.classList.add('filled');
                        }
                    }
                }
            });

            // Re-evaluate submit button state
            if (submitAnswersBtn) {
                 const hasRestoredAnswers = Object.values(userAnswers).some(ans => ans && ans.trim() !== "");
                 submitAnswersBtn.disabled = !hasRestoredAnswers && Object.keys(userAnswers).length === 0 ;
            }
        } else if (currentActualExercise) { // If only exercise data exists but no passage (unlikely here)
            renderCurrentExerciseStudent();
        }
    }


    // --- Drag and Drop (DND) Handlers ---
    function handleDNDDragStart(event) {
        const targetElement = event.target.closest('.draggable-word'); // Ensure we get the draggable root
        if (!targetElement) return;

        // Data to transfer: the word itself and the ID of the draggable element
        event.dataTransfer.setData("text/plain", targetElement.dataset.dndWord || targetElement.textContent.trim());
        event.dataTransfer.setData("text/id", targetElement.id);
        event.dataTransfer.effectAllowed = "move";
        targetElement.classList.add('dragging'); // Visual feedback
    }

    function handleDNDDragOverZone(event) {
        event.preventDefault(); // Necessary to allow dropping
        event.dataTransfer.dropEffect = "move";
        const dropzone = event.target.closest('.dropzone');
        if (dropzone) dropzone.classList.add('drag-over'); // Visual feedback
    }

    function handleDNDDragLeaveZone(event) {
        const dropzone = event.target.closest('.dropzone');
        if (dropzone) dropzone.classList.remove('drag-over');
    }

    function handleDNDDropInZone(event) {
        event.preventDefault();
        const targetDropzone = event.target.closest('.dropzone');
        if (!targetDropzone) return;

        targetDropzone.classList.remove('drag-over');
        const blankIndex = parseInt(targetDropzone.dataset.blankIndex, 10);
        const droppedWord = event.dataTransfer.getData("text/plain");
        const draggedItemId = event.dataTransfer.getData("text/id");
        const draggedItemElement = document.getElementById(draggedItemId);

        // If this dropzone already had a word, return that word to the options pool
        if (targetDropzone.dataset.originalDraggableId && targetDropzone.dataset.originalDraggableId !== draggedItemId) {
            const previousItemId = targetDropzone.dataset.originalDraggableId;
            const previousItemElement = document.getElementById(previousItemId);
            if (previousItemElement && dndOptionsContainer) {
                previousItemElement.style.display = 'inline-flex'; // Or 'block', 'flex' depending on CSS
                dndOptionsContainer.appendChild(previousItemElement); // Add back to options
                previousItemElement.draggable = true;
            }
        }

        // Place the new word
        targetDropzone.textContent = droppedWord;
        targetDropzone.classList.add('filled');
        targetDropzone.setAttribute('title', 'Click to remove this word');
        targetDropzone.classList.remove('correct', 'incorrect', 'unanswered'); // Clear feedback styling
        targetDropzone.dataset.originalDraggableId = draggedItemId; // Store which item was dropped
        userAnswers[blankIndex] = droppedWord;

        // Hide the dragged item from the options pool
        if (draggedItemElement) {
            draggedItemElement.style.display = 'none';
        }

        // If this word was previously in another dropzone, clear that other dropzone
        document.querySelectorAll('.dropzone.filled').forEach(dz => {
            if (dz !== targetDropzone && dz.dataset.originalDraggableId === draggedItemId) {
                dz.innerHTML = '&nbsp;'; // Or your placeholder content
                dz.classList.remove('filled', 'correct', 'incorrect', 'unanswered');
                dz.setAttribute('title', 'Drop a word here');
                delete dz.dataset.originalDraggableId;
                delete userAnswers[parseInt(dz.dataset.blankIndex, 10)];
            }
        });

        if (feedbackSection) feedbackSection.innerHTML = ''; // Clear overall feedback
        if (scoreDisplayEl) scoreDisplayEl.classList.add('hidden');
        if (submitAnswersBtn) submitAnswersBtn.disabled = false; // Enable submit
    }

    function handleDropzoneClickToRemove(event) {
        const clickedDropzone = event.currentTarget; // Should be the dropzone itself
        if (clickedDropzone.classList.contains('filled') && clickedDropzone.dataset.originalDraggableId) {
            const blankIndex = parseInt(clickedDropzone.dataset.blankIndex, 10);
            const originalDraggableId = clickedDropzone.dataset.originalDraggableId;
            const draggableWordElement = document.getElementById(originalDraggableId);

            // Return the word to the options container
            if (draggableWordElement && dndOptionsContainer) {
                draggableWordElement.style.display = 'inline-flex'; // Or 'block', 'flex'
                draggableWordElement.draggable = true; // Ensure it's draggable again
                dndOptionsContainer.appendChild(draggableWordElement); // Re-append
            }

            // Clear the dropzone
            clickedDropzone.innerHTML = '&nbsp;'; // Or your placeholder
            clickedDropzone.classList.remove('filled', 'correct', 'incorrect', 'unanswered');
            clickedDropzone.setAttribute('title', 'Drop a word here');
            delete clickedDropzone.dataset.originalDraggableId;
            delete userAnswers[blankIndex];

            if (feedbackSection) feedbackSection.innerHTML = '';
            if (scoreDisplayEl) scoreDisplayEl.classList.add('hidden');
            // Disable submit if all answers are cleared
            if (submitAnswersBtn) {
                submitAnswersBtn.disabled = Object.values(userAnswers).every(ans => !ans || ans.trim() === "");
            }
        }
    }

    function handleGlobalDragEnd(event) {
        const target = event.target;
        if (target.classList && target.classList.contains('draggable-word')) {
            target.classList.remove('dragging'); // Clean up dragging class

            // If drag ended without a successful drop (e.g., outside a valid zone)
            // and the item is not currently in a dropzone, return it to the options.
            if (event.dataTransfer.dropEffect === 'none' && dndOptionsContainer && target.parentElement !== dndOptionsContainer) {
                 const isInDropZone = Array.from(document.querySelectorAll('.dropzone')).some(dz => dz.dataset.originalDraggableId === target.id);
                 if (!isInDropZone) { // Not in a dropzone, means it was dragged out invalidly
                    target.style.display = 'inline-flex'; // Or your default display
                    dndOptionsContainer.appendChild(target);
                 }
            }
        }
        // Clean up any stray drag-over classes on dropzones
        document.querySelectorAll('.dropzone.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }


    // --- Answer Submission, Confidence, and Feedback ---
    function preCheckAllAnswers() {
        if (!currentActualExercise || !passageContainer) {
            showToast("No exercise loaded to submit.", "error");
            return;
        }
        if(feedbackSection) feedbackSection.innerHTML = ''; // Clear old feedback

        const blanksInExercise = currentActualExercise.blanks || [];
        const answeredBlankIndices = [];

        // Ensure userAnswers is up-to-date from inputs (especially for FIB_RW)
        blanksInExercise.forEach((blankData, idx) => {
            if (currentActualExercise.exerciseType === 'FIB_RW') {
                const dropdown = passageContainer.querySelector(`.fib-dropdown[data-blank-index="${idx}"]`);
                if (dropdown) userAnswers[idx] = dropdown.value; // Update from dropdown
            }
            // For DND, userAnswers should be updated by drop/remove handlers
            if (userAnswers[idx] && userAnswers[idx].trim() !== "") {
                answeredBlankIndices.push(idx);
            }
        });

        if (answeredBlankIndices.length === 0 && blanksInExercise.length > 0) {
            showToast("Please attempt at least one blank before submitting.", "warning");
            return;
        }
        startConfidenceCollection(answeredBlankIndices);
    }

    function startConfidenceCollection(indicesOfAnsweredBlanks) {
        pendingConfidenceChecks = [...indicesOfAnsweredBlanks];
        userConfidence = {}; // Reset confidence for this submission
        currentConfidencePromptIndex = -1; // Start before the first item
        checkNextConfidenceOrProceed();
    }

    function checkNextConfidenceOrProceed() {
        currentConfidencePromptIndex++;
        if (currentConfidencePromptIndex < pendingConfidenceChecks.length) {
            promptForConfidence(pendingConfidenceChecks[currentConfidencePromptIndex]);
        } else {
            actuallyShowAllFeedback(); // All confidences collected, show feedback
        }
    }

    function promptForConfidence(blankIndex) {
        currentBlankForConfidence = blankIndex;
        if(confidenceBlankNumberSpan) confidenceBlankNumberSpan.textContent = (blankIndex + 1).toString();
        openModal('confidenceModal');
    }

    function setConfidence(blankIndex, level) {
        if (blankIndex === -1 || typeof blankIndex === 'undefined') {
            console.warn("Invalid blankIndex for setting confidence:", blankIndex);
            return;
        }
        userConfidence[blankIndex] = level;
    }

    function actuallyShowAllFeedback() {
        if (!currentActualExercise || !passageContainer) return;

        let allHintsHTML = "";
        let correctAnswersCount = 0;
        const totalBlanksInExercise = (currentActualExercise.blanks || []).length;

        stopIndividualExerciseTimerAndLog(); // Stop and log time for this exercise

        // Display time taken for this exercise attempt
        if (exerciseStartTime && appSettings.showExerciseTimer) {
            const elapsedSeconds = Math.floor((new Date() - exerciseStartTime) / 1000);
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            allHintsHTML += `<div class="time-info feedback-section-header"><p><strong>Time Taken for this attempt:</strong> ${minutes}m ${seconds}s</p></div>`;
        }
        // exerciseStartTime = null; // Reset for next attempt/exercise in startIndividualExerciseTimer

        (currentActualExercise.blanks || []).forEach((blankData, blankIdx) => {
            const selectedAnswer = userAnswers[blankIdx] || "";
            const isCorrect = selectedAnswer.trim().toLowerCase() === (blankData.correct_answer || "").trim().toLowerCase();

            if (selectedAnswer.trim() !== "") { // Only count if answered
                if (isCorrect) correctAnswersCount++;
            }

            // Apply visual feedback to input elements
            const blankElementContainer = passageContainer.querySelector(`.blank-wrapper[data-blank-index="${blankIdx}"]`);
            const blankInputElement = blankElementContainer?.querySelector('select.fib-dropdown, span.dropzone');

            if (blankInputElement) {
                blankInputElement.classList.remove('correct', 'incorrect', 'unanswered'); // Clear previous
                if (selectedAnswer.trim() === "") {
                    blankInputElement.classList.add('unanswered');
                } else {
                    blankInputElement.classList.add(isCorrect ? 'correct' : 'incorrect');
                }
            }
            // Generate detailed hint HTML for this blank
            allHintsHTML += generateDetailedHintForBlank(selectedAnswer, blankIdx, currentActualExercise);
        });

        if(feedbackSection) feedbackSection.innerHTML = allHintsHTML;
        const scorePercentage = totalBlanksInExercise > 0 ? Math.round((correctAnswersCount / totalBlanksInExercise) * 100) : 0;

        if(scoreTextEl) scoreTextEl.textContent = `${scorePercentage}% (${correctAnswersCount}/${totalBlanksInExercise})`;
        if(progressFillEl) progressFillEl.style.width = `${scorePercentage}%`;
        if(scoreDisplayEl) scoreDisplayEl.classList.remove('hidden');

        recordExerciseCompletion(currentActualExercise.id, scorePercentage);

        // Update button states after submission
        if(submitAnswersBtn) submitAnswersBtn.disabled = true; // Submitted
        if(resetExerciseBtn) resetExerciseBtn.disabled = false; // Can always reset after submission

        if(getInitialHintsBtn) {
          const hasClues = passageContainer && passageContainer.querySelectorAll('.passage-clue-highlight').length > 0;
          getInitialHintsBtn.disabled = !hasClues;
          const clueBtnTextSpan = getInitialHintsBtn.querySelector('.btn-text');
          const reviewText = 'Review Clues';
          if(clueBtnTextSpan) clueBtnTextSpan.textContent = reviewText;
          else {
              const textNode = Array.from(getInitialHintsBtn.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
              if (textNode) textNode.nodeValue = ` ${reviewText}`;
          }
          getInitialHintsBtn.setAttribute('aria-pressed', 'false'); // Reset emphasis state
          getInitialHintsBtn.classList.remove('active');
        }
        const canNavigate = filteredExercises.length > 1;
        if (prevExerciseBtn) prevExerciseBtn.disabled = !canNavigate;
        if (nextExerciseBtn) nextExerciseBtn.disabled = !canNavigate;

        // Focus the feedback section for screen readers
        if(feedbackSection) feedbackSection.setAttribute('tabindex', '-1');
        if(feedbackSection) feedbackSection.focus();
     }

    function generateDetailedHintForBlank(selectedAnswer, blankIdx, exerciseData) {
        const blankData = (exerciseData.blanks || []).find(b => b.blank_index === blankIdx); // Ensure blanks array exists
        if (!blankData) {
            console.warn(`No blank data found for index ${blankIdx}`);
            return `<div class="hint-container-approach-b error-feedback"><div class="hint-header">❌ Error</div><div class="hint-body"><p>Hint data missing for blank ${blankIdx + 1}.</p></div></div>`;
        }

        const correctAnswer = blankData.correct_answer || "N/A";
        const analysis = blankData.analysis_and_hints;
        // Determine resource scope: exercise-specific or global
        const currentExerciseLinguisticResources = exerciseData.linguistic_resources || linguisticResources;

        const normalizedSelectedAnswer = selectedAnswer ? selectedAnswer.trim().toLowerCase() : "";
        const isCorrect = normalizedSelectedAnswer === correctAnswer.trim().toLowerCase();
        const confidenceLevel = userConfidence[blankIdx];
        let confidenceText = "";
        let confidenceFeedback = "";

        if (confidenceLevel && normalizedSelectedAnswer !== "") {
            const confidenceMap = { "sure": "Very Sure", "bit_sure": "A Bit Sure", "guessing": "Just Guessing" };
            confidenceText = ` (You were: ${confidenceMap[confidenceLevel] || 'Not Specified'})`;

            if (isCorrect) {
                if (confidenceLevel === "guessing") confidenceFeedback = "<p class='confidence-insight guessing-correct'><i class='fas fa-lightbulb'></i> You guessed correctly! Try to understand why this is the right answer for future confidence.</p>";
                else if (confidenceLevel === "bit_sure") confidenceFeedback = "<p class='confidence-insight bit-sure-correct'><i class='fas fa-thumbs-up'></i> Good job! You were on the right track.</p>";
                else confidenceFeedback = "<p class='confidence-insight sure-correct'><i class='fas fa-star'></i> Excellent! Your confidence was well-placed.</p>";
            } else { // Incorrect
                if (confidenceLevel === "sure") confidenceFeedback = "<p class='confidence-insight sure-incorrect'><i class='fas fa-exclamation-triangle'></i> You were very sure, but this was incorrect. This might point to a misunderstanding. Review the explanation carefully.</p>";
                else if (confidenceLevel === "bit_sure") confidenceFeedback = "<p class='confidence-insight bit-sure-incorrect'><i class='fas fa-search'></i> You had some doubts, and it was indeed incorrect. Focus on the hints provided.</p>";
                else confidenceFeedback = "<p class='confidence-insight guessing-incorrect'><i class='fas fa-question-circle'></i> You were guessing, and it was incorrect. Let's learn why!</p>";
            }
        }

        let hintStatusClass = 'neutral-feedback'; let hintStatusIcon = '💬';
        if (normalizedSelectedAnswer !== "") { // Answered
            hintStatusClass = isCorrect ? 'correct-answer-feedback' : 'incorrect-answer-feedback';
            hintStatusIcon = isCorrect ? '✔️' : '❌';
        } else { // Not answered
             hintStatusIcon = '➖'; // Em-dash for not answered
        }

        let hintsHtml = `<div class="hint-container-approach-b ${hintStatusClass}">`;
        hintsHtml += `<div class="hint-header">${hintStatusIcon} Blank ${blankIdx + 1} Insights</div>`;
        hintsHtml += `<div class="feedback-content hint-body">`;
        hintsHtml += `<div class="answers-comparison">
                        <p><strong>Your Answer:</strong> <span class="user-answer">${escapeHTML(selectedAnswer) || "<em>(not answered)</em>"}</span>${confidenceText}</p>
                        ${!isCorrect && normalizedSelectedAnswer !== "" ? `<p><strong>Correct Answer:</strong> <span class="correct-answer-text">${escapeHTML(correctAnswer)}</span></p>` : ''}
                      </div>`;
        if(confidenceFeedback) hintsHtml += confidenceFeedback;

        if (!analysis) {
            hintsHtml += `<p>Detailed analysis not available for this blank.</p></div></div>`;
            return hintsHtml;
        }

        // Primary Reason
        if (analysis.primary_reason) {
            hintsHtml += `<div class="hint-section primary-reason-section"><h5>⭐ Key Reason for '${escapeHTML(correctAnswer)}':</h5><p>${parseInteractiveText(analysis.primary_reason, currentExerciseLinguisticResources)}</p></div>`;
        }

        // Distractor Analysis (if incorrect and analysis exists for chosen distractor)
        if (!isCorrect && normalizedSelectedAnswer !== "" && Array.isArray(analysis.distractor_analysis)) {
            const distractorInfo = analysis.distractor_analysis.find(d => d.option && d.option.toLowerCase() === normalizedSelectedAnswer);
            if (distractorInfo) {
                hintsHtml += `<div class="hint-section distractor-analysis-section"><h5>🤔 Why '${escapeHTML(selectedAnswer)}' is not the best fit:</h5><p>${parseInteractiveText(distractorInfo.reason, currentExerciseLinguisticResources)}</p>`;

                // Common Error Pattern Link
                let patternData = null;
                if(currentExerciseLinguisticResources?.common_error_patterns){ // Check if resources and patterns exist
                    if(Array.isArray(currentExerciseLinguisticResources.common_error_patterns)){ // Array of objects
                         patternData = currentExerciseLinguisticResources.common_error_patterns.find(p => p.id === distractorInfo.common_error_pattern_id);
                    } else { // Object with IDs as keys (older format?)
                         patternData = currentExerciseLinguisticResources.common_error_patterns[distractorInfo.common_error_pattern_id];
                    }
                }

                if (distractorInfo.common_error_pattern_id && patternData) {
                    hintsHtml += `<p class="common-error-ref">This relates to a common pattern: <strong>${escapeHTML(patternData.name)}</strong>.
                                 <button class="mastery-path-button btn-link-style" data-pattern-id="${distractorInfo.common_error_pattern_id}" title="Learn more about ${escapeHTML(patternData.name)}">Master this Concept »</button>
                                 </p>`;
                }
                hintsHtml += `</div>`;
            }
        }

        // Collapsible Deeper Dive section
        const dDContentId = `dd-hint-${blankIdx}-${Date.now().toString(36)}`; // Unique ID for ARIA
        let deeperDiveHTML = "";
        if (analysis.pos_tag_correct_answer) deeperDiveHTML += `<div class="sub-hint-section"><h6>Expected Part of Speech:</h6><p>${escapeHTML(analysis.pos_tag_correct_answer)}</p></div>`;
        if (analysis.grammatical_fit) deeperDiveHTML += `<div class="sub-hint-section"><h6>Grammatical Context:</h6><p>${parseInteractiveText(analysis.grammatical_fit, currentExerciseLinguisticResources)}</p></div>`;
        if (analysis.collocations?.length) deeperDiveHTML += `<div class="sub-hint-section"><h6>Common Collocations:</h6><ul>${analysis.collocations.map(c => `<li>${parseInteractiveText(c, currentExerciseLinguisticResources)}</li>`).join('')}</ul></div>`;
        if (analysis.semantic_fit) deeperDiveHTML += `<div class="sub-hint-section"><h6>Semantic Nuance:</h6><p>${parseInteractiveText(analysis.semantic_fit, currentExerciseLinguisticResources)}</p></div>`;

        if (deeperDiveHTML) {
            hintsHtml += `<div class="hint-section detailed-analysis">
                            <h5 class="collapsible-header" data-target-id="${dDContentId}" role="button" tabindex="0" aria-expanded="false" aria-controls="${dDContentId}">
                                🔬 Deeper Dive <span class="toggle-indicator" aria-hidden="true">[+]</span>
                            </h5>
                            <div id="${dDContentId}" class="collapsible-content" style="display:none;">${deeperDiveHTML}</div>
                          </div>`;
        }

        // Learning Tip
        if (analysis.learning_tip) {
            hintsHtml += `<div class="hint-section learning-tip-section"><h5>💡 Pro Tip:</h5><p>${parseInteractiveText(analysis.learning_tip, currentExerciseLinguisticResources)}</p></div>`;
        }

        // Skill Tags
        if (analysis.skill_tags?.length) {
            hintsHtml += `<div class="hint-section skills-targeted-section"><h5>🎯 Skills Practiced:</h5><p>${analysis.skill_tags.map(s => `<span class="skill-tag">${escapeHTML(s)}</span>`).join(' ')}</p></div>`;
        }

        hintsHtml += `</div></div>`; // Close hint-body and hint-container
        return hintsHtml;
    }


    // --- Event Handlers for Dynamically Created Content ---
    function handleDynamicClicks(event) {
        const target = event.target;

        // Collapsible Headers in Hints
        const collapsibleHeader = target.closest('.collapsible-header');
        if (collapsibleHeader) {
            event.preventDefault(); // Prevent any default action if it's a link/button
            const targetId = collapsibleHeader.dataset.targetId;
            const contentElement = document.getElementById(targetId);
            const indicator = collapsibleHeader.querySelector('.toggle-indicator');
            if (contentElement) {
                const isHidden = contentElement.style.display === 'none' || contentElement.style.display === '';
                contentElement.style.display = isHidden ? 'block' : 'none';
                collapsibleHeader.setAttribute('aria-expanded', String(isHidden));
                if (indicator) indicator.textContent = isHidden ? ' [-]' : ' [+]';
            }
            return; // Processed this click
        }

        // Mastery Path Buttons (for Common Error Patterns)
        const masteryButton = target.closest('.mastery-path-button');
        if (masteryButton) {
            const patternId = masteryButton.dataset.patternId;
            const resources = currentActualExercise?.linguistic_resources || linguisticResources; // Scope resources
            let patternData = null;

            if(resources?.common_error_patterns){
                if(Array.isArray(resources.common_error_patterns)){
                     patternData = resources.common_error_patterns.find(p => p.id === patternId);
                } else { // Object map
                     patternData = resources.common_error_patterns[patternId];
                }
            }

            if (patternData) {
                showInfoModal(`Mastery: ${escapeHTML(patternData.name)}`,
                              `<p>${parseInteractiveText(patternData.explanation || patternData.description, resources)}</p>` +
                              (patternData.examples ? `<h5>Examples:</h5><ul>${patternData.examples.map(ex => `<li>${escapeHTML(ex)}</li>`).join('')}</ul>` : ''));
            } else {
                showToast("Details for this error pattern are not available.", "info");
            }
            return; // Processed
        }

        // Interactive Hint Terms (Key Terms)
        const keyTermSpan = target.closest('.interactive-hint-term');
        if (keyTermSpan) {
            const termId = keyTermSpan.dataset.termId;
            const resources = currentActualExercise?.linguistic_resources || linguisticResources;
            let termData = null;

            if(resources?.key_terms){
                if(Array.isArray(resources.key_terms)){ // Array of objects
                    termData = resources.key_terms.find(t => t.id === termId || (t.term && (t.term.toLowerCase().replace(/\s+/g, '_')) === termId) );
                } else { // Object map
                    termData = resources.key_terms[termId];
                }
            }
            if (termData) {
                showInfoModal(`Definition: ${escapeHTML(termData.name || termData.term)}`,
                              `<p>${escapeHTML(termData.definition)}</p>` +
                              (termData.examples ? `<h5>Examples:</h5><ul>${termData.examples.map(ex => `<li>${escapeHTML(ex)}</li>`).join('')}</ul>` : ''));
            } else {
                showToast("Definition for this term is not available.", "info");
            }
            return; // Processed
        }
    }

    function handleGlobalKeydown(event) {
        if (event.key === "Escape") {
            // Close the topmost visible modal
            const visibleModals = document.querySelectorAll('.modal:not(.hidden)');
            if (visibleModals.length > 0) {
                // Modals might be nested, find the one with highest z-index or just last in DOM order
                closeModal(visibleModals[visibleModals.length - 1].id);
            }
        }
        // Handle Enter/Space on focused interactive elements for accessibility
        if (event.key === "Enter" || event.key === " ") {
            const activeEl = document.activeElement;
            if (activeEl) {
                if (activeEl.classList.contains('collapsible-header') ||
                    activeEl.classList.contains('mastery-path-button') ||
                    activeEl.classList.contains('interactive-hint-term') ||
                    activeEl.classList.contains('word-pos-interactive')) {
                    event.preventDefault(); // Prevent scrolling or other default actions
                    activeEl.click(); // Simulate a click
                }
            }
        }
    }


    // --- Text Parsing & Utility Functions ---
    function escapeHTML(str) {
        if (str === null || typeof str === 'undefined') return '';
        return String(str)
            .replace(/&/g, "&amp;") // Must be first
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;"); // Or &apos; but &#039; is more widely supported
    }

    function escapeRegExp(string) {
        if (typeof string !== 'string') return '';
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    function parseInteractiveText(text, resourcesScope) {
        if (!text || typeof text !== 'string') return escapeHTML(String(text)); // Ensure text is a string and escape

        let keyTermsToUse = {}; // Normalized key terms structure
        // Check if resourcesScope and key_terms exist
        if(resourcesScope?.key_terms) {
            if(Array.isArray(resourcesScope.key_terms)) { // If it's an array of term objects
                resourcesScope.key_terms.forEach(item => {
                    // Use item.id if present, otherwise generate one from item.term
                    const id = item.id || (item.term && item.term.toLowerCase().replace(/\s+/g, '_')) || `term-${Math.random().toString(36).slice(2)}`;
                    keyTermsToUse[id] = item;
                });
            } else { // If it's an object map (ID -> term object)
                keyTermsToUse = resourcesScope.key_terms;
            }
        }

        if (Object.keys(keyTermsToUse).length === 0) return text; // No terms to process, return original text

        let processedText = text;
        // Sort term keys by the length of their display name (longest first) to avoid partial matches
        const sortedTermKeys = Object.keys(keyTermsToUse).sort((a,b) => {
            const nameA = keyTermsToUse[a]?.name || keyTermsToUse[a]?.term || "";
            const nameB = keyTermsToUse[b]?.name || keyTermsToUse[b]?.term || "";
            return nameB.length - nameA.length;
        });

        for (const termId of sortedTermKeys) {
            const termData = keyTermsToUse[termId];
            const termDisplayName = termData?.name || termData?.term;
            if (!termDisplayName) continue; // Skip if no display name

            const termNameForRegex = escapeRegExp(termDisplayName);
            // Regex: \b (word boundary), (?![^<>]*?>) (not inside HTML tag),
            // (?<!data-term-id=['"][^<>]*?) (not already part of a data-term-id attribute value)
            // (?<!<[\w\s="'-]*?) (negative lookbehind to avoid matching inside opening tag attributes)
            const regex = new RegExp(`\\b(${termNameForRegex})\\b(?![^<>]*?>)(?<!data-term-id=['"][^<>]*?)(?<!<[\\w\\s="'-]*?)`, 'gi');

            processedText = processedText.replace(regex, (match) => {
                // Double check it's not part of an attribute or already wrapped. This is tricky with regex alone.
                // A more robust solution would involve DOM parsing if text could contain complex HTML.
                // For simple text with potential existing simple spans, this should be okay.
                return `<span class="interactive-hint-term" data-term-id="${termId}" title="Click for definition: ${escapeHTML(termDisplayName)}" role="button" tabindex="0">${escapeHTML(match)}</span>`;
            });
        }
        return processedText; // This text now contains HTML, so ensure it's used with innerHTML
    }

    function simplifyPosTags(tagsString) {
        if (!tagsString || typeof tagsString !== 'string') return 'Word'; // Default
        // Split by common delimiters and clean up
        const tags = tagsString.toLowerCase().split(/[,()\s]+/).map(t => t.trim()).filter(t => t && t.length > 0);

        const tagHierarchy = [ // Order matters: more specific or common ones first
            { check: ['propernoun', 'noun', 'pronoun', 'singular', 'plural', 'person', 'place', 'organization'], out: 'Noun' },
            { check: ['verb', 'infinitive', 'verbphrase', 'auxiliary', 'pasttense', 'presenttense', 'futuretense', 'gerund', 'participle', 'modal', 'copula'], out: 'Verb' },
            { check: ['adjective'], out: 'Adjective' },
            { check: ['adverb'], out: 'Adverb' },
            { check: ['preposition'], out: 'Preposition' },
            { check: ['conjunction', 'coordinatingconjunction', 'subordinatingconjunction'], out: 'Conjunction' },
            { check: ['determiner', 'article'], out: 'Determiner' },
            { check: ['interjection'], out: 'Interjection' },
            { check: ['value', 'ordinal', 'cardinal', 'number'], out: 'Number' },
            { check: ['possessive'], out: 'Possessive' }
            // Add more mappings as needed based on compromise.js output
        ];

        for (const rule of tagHierarchy) {
            if (rule.check.some(tagToCheck => tags.includes(tagToCheck))) {
                return rule.out;
            }
        }
        // Fallback: Capitalize the first tag found if no rule matches
        const firstTag = tags[0];
        return firstTag && firstTag.length > 0 ? (firstTag.charAt(0).toUpperCase() + firstTag.slice(1)) : 'Word';
    }


    // --- Timers for Exercises ---
    function startIndividualExerciseTimer() {
        // This timer is for a single attempt at an exercise
        if (!appSettings.showExerciseTimer) { // Respect global setting
            exerciseStartTime = null;
            return;
        }
        exerciseStartTime = new Date(); // Record start time for current attempt
        // No UI display for this timer, it's logged on submission
    }

    function stopIndividualExerciseTimerAndLog() {
        // Called when an exercise is submitted (in actuallyShowAllFeedback)
        // The duration is calculated and displayed there.
        // exerciseStartTime is reset to null there or by starting a new exercise.
        // Global study timer continues independently.
    }


    // --- Public API of PTEApp ---
    // Expose only what's absolutely necessary for external calls (e.g., from HTML onclick, though ideally all events are bound in JS)
    // Given the full encapsulation, very little should be public. `init` is the main one.
    return {
        init: init
        // If any inline HTML event handlers `onclick="PTEApp.someFunction()"` are *unavoidable*,
        // they would need to be exposed here. However, the goal is to bind all events in JS.
        // e.g., openModal, closeModal could be public if needed by external scripts.
    };
})();

// Initialize the application after the PTEApp module is defined and DOM is ready
document.addEventListener('DOMContentLoaded', PTEApp.init);

console.log("PTE Navigator Pro script (Further Enhanced) fully parsed and IIFE defined. Initialization on DOMContentLoaded.");
