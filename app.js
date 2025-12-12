class RoyalVaultApp {
    constructor() {
        this.currentUser = null;
        this.files = [];
        this.currentSection = 'dashboard';
        this.MAX_FILE_SIZE = (AppConfig.DEFAULT_MAX_SIZE || 1) * 1024 * 1024;
        this.MAX_ALLOWED_SIZE = (AppConfig.MAX_ALLOWED_SIZE || 10) * 1024 * 1024;
        
        // Upload system variables
        this.uploadQueue = [];
        this.activeUploads = [];
        this.isUploading = false;
        this.isPaused = false;
        this.chunkSize = (AppConfig.DEFAULT_CHUNK_SIZE || 256) * 1024;
        this.maxParallelUploads = AppConfig.MAX_PARALLEL_UPLOADS || 2;
        
        // Speed monitoring
        this.speedHistory = [];
        this.currentSpeed = 0;
        this.averageSpeed = 0;
        this.peakSpeed = 0;
        this.totalUploaded = 0;
        this.totalSize = 0;
        this.uploadStartTime = null;
        
        // Performance tracking
        this.speedTestResult = null;
        this.speedUpdateInterval = null;
        this.statsInterval = null;
        
        this.initializeEventListeners();
        this.checkAuthState();
        if (AppConfig.ENABLE_SPEED_TEST) {
            this.startInternetSpeedTest();
        }
    }
    
    initializeEventListeners() {
        // Auth toggles
        document.getElementById('login-toggle').addEventListener('click', () => this.toggleAuth('login'));
        document.getElementById('signup-toggle').addEventListener('click', () => this.toggleAuth('signup'));
        
        // Auth form
        document.getElementById('auth-form').addEventListener('submit', (e) => this.handleAuth(e));
        
        // Forgot password
        document.getElementById('forgot-password').addEventListener('click', (e) => {
            e.preventDefault();
            this.showForgotModal();
        });
        document.getElementById('cancel-reset').addEventListener('click', () => this.hideForgotModal());
        document.getElementById('send-reset').addEventListener('click', () => this.sendPasswordReset());
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSection(item.dataset.section);
            });
        });
        
        // File upload
        const fileUpload = document.getElementById('file-upload');
        fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Drag and drop
        const uploadArea = document.querySelector('.upload-area');
        uploadArea.addEventListener('click', () => fileUpload.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = AppConfig.SUCCESS_COLOR;
            uploadArea.style.background = `rgba(${parseInt(AppConfig.SUCCESS_COLOR.slice(1, 3), 16)}, ${parseInt(AppConfig.SUCCESS_COLOR.slice(3, 5), 16)}, ${parseInt(AppConfig.SUCCESS_COLOR.slice(5, 7), 16)}, 0.1)`;
            uploadArea.style.transform = 'scale(1.02)';
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            uploadArea.style.background = '';
            uploadArea.style.transform = '';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            uploadArea.style.background = '';
            uploadArea.style.transform = '';
            
            if (e.dataTransfer.files.length) {
                fileUpload.files = e.dataTransfer.files;
                this.handleFileUpload({ target: fileUpload });
            }
        });
        
        // Upload control listeners
        document.getElementById('cancel-upload').addEventListener('click', () => this.cancelAllUploads());
        document.getElementById('pause-upload').addEventListener('click', () => this.pauseUpload());
        document.getElementById('resume-upload').addEventListener('click', () => this.resumeUpload());
        document.getElementById('clear-queue').addEventListener('click', () => this.clearUploadQueue());
        
        // Settings
        document.getElementById('save-settings').addEventListener('click', () => this.updateProfile());
        
        // Generate Share Link
        document.getElementById('generate-share-link').addEventListener('click', () => this.generateShareLink());
        
        // Modal close buttons
        document.querySelectorAll('.close-modal, #close-preview').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
        
        // Search
        document.getElementById('search-input').addEventListener('input', (e) => this.searchFiles(e.target.value));
        
        // Filter
        document.getElementById('filter-type').addEventListener('change', (e) => this.filterFiles(e.target.value));
        
        // Generate share link from preview
        document.getElementById('generate-file-share').addEventListener('click', () => {
            const fileId = document.getElementById('preview-title').dataset.fileId;
            if (fileId) this.generateFileShareLink(fileId);
        });
        
        // Download from preview
        document.getElementById('download-file').addEventListener('click', () => {
            const fileId = document.getElementById('preview-title').dataset.fileId;
            if (fileId) this.downloadFile(fileId);
        });
        
        // Delete from preview
        document.getElementById('delete-file').addEventListener('click', () => {
            const fileId = document.getElementById('preview-title').dataset.fileId;
            if (fileId) this.deleteFile(fileId);
        });
        
        // File size slider
        const sizeSlider = document.getElementById('max-file-size');
        const sizeValue = document.getElementById('size-value');
        
        if (sizeSlider && sizeValue) {
            sizeSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                sizeValue.textContent = `${value} MB`;
                
                document.querySelectorAll('.size-preset').forEach(preset => {
                    preset.classList.remove('active');
                    if (parseInt(preset.dataset.size) === parseInt(value)) {
                        preset.classList.add('active');
                    }
                });
            });
        }
        
        // Size preset buttons
        document.querySelectorAll('.size-preset').forEach(preset => {
            preset.addEventListener('click', (e) => {
                const size = parseInt(e.target.dataset.size);
                document.getElementById('max-file-size').value = size;
                document.getElementById('size-value').textContent = `${size} MB`;
                
                document.querySelectorAll('.size-preset').forEach(p => {
                    p.classList.remove('active');
                });
                e.target.classList.add('active');
            });
        });
        
        // Chunk size selector
        document.getElementById('chunk-size').addEventListener('change', (e) => {
            this.chunkSize = parseInt(e.target.value) * 1024;
        });
        
        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        
        // Apply configuration
        this.applyAppConfig();
    }
    
    applyAppConfig() {
        // Update app name and tagline
        const appNameElements = document.querySelectorAll('.app-name-display');
        appNameElements.forEach(el => {
            el.textContent = AppConfig.APP_NAME;
        });
        
        const taglineElements = document.querySelectorAll('.app-tagline-display');
        taglineElements.forEach(el => {
            el.textContent = AppConfig.APP_TAGLINE;
        });
        
        // Update logo
        const logoIcons = document.querySelectorAll('.app-logo');
        logoIcons.forEach(icon => {
            if (AppConfig.LOGO_TYPE === "image" && AppConfig.LOGO_IMAGE_URL) {
                icon.innerHTML = `<img src="${AppConfig.LOGO_IMAGE_URL}" alt="${AppConfig.APP_NAME}" style="width: 40px; height: 40px;">`;
            } else {
                icon.innerHTML = `<i class="${AppConfig.LOGO_ICON}"></i>`;
            }
        });
        
        // Update colors in UI elements
        document.querySelectorAll('.royal-gradient').forEach(el => {
            el.style.background = `linear-gradient(135deg, ${AppConfig.PRIMARY_COLOR} 0%, ${AppConfig.SECONDARY_COLOR} 100%)`;
        });
        
        document.querySelectorAll('.royal-btn').forEach(btn => {
            btn.style.background = `linear-gradient(45deg, ${AppConfig.PRIMARY_COLOR} 0%, ${AppConfig.SECONDARY_COLOR} 100%)`;
        });
        
        // Update file size info
        const maxSizeMB = Math.round(this.MAX_FILE_SIZE / (1024 * 1024));
        document.getElementById('file-size-info').textContent = 
            `Upload to Firebase Realtime DB (max ${maxSizeMB}MB)`;
    }
    
    async startInternetSpeedTest() {
        if (!AppConfig.ENABLE_SPEED_TEST) return;
        
        const testImage = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/320px-Google_2015_logo.svg.png';
        const startTime = Date.now();
        
        try {
            const response = await fetch(testImage + '?cache=' + Date.now());
            const blob = await response.blob();
            const endTime = Date.now();
            
            const duration = (endTime - startTime) / 1000;
            const sizeInBytes = blob.size;
            const speedBps = sizeInBytes / duration;
            const speedKbps = speedBps / 1024;
            const speedMbps = speedKbps / 1024;
            
            this.speedTestResult = {
                kbps: Math.round(speedKbps),
                mbps: Math.round(speedMbps * 10) / 10
            };
            
            this.updateSpeedDisplay();
            
            this.speedUpdateInterval = setInterval(() => this.updateSpeedDisplay(), 10000);
            
        } catch (error) {
            this.speedTestResult = { kbps: 1000, mbps: 1 };
            this.updateSpeedDisplay();
        }
    }
    
    updateSpeedDisplay() {
        const speedEl = document.getElementById('internet-speed');
        if (!speedEl) return;
        
        if (this.speedTestResult) {
            if (this.speedTestResult.mbps >= 1) {
                speedEl.textContent = `${this.speedTestResult.mbps} Mbps`;
            } else {
                speedEl.textContent = `${this.speedTestResult.kbps} Kbps`;
            }
        }
        
        const currentSpeedEl = document.getElementById('current-speed-text');
        if (currentSpeedEl) {
            const speed = this.currentSpeed;
            currentSpeedEl.className = '';
            
            if (speed > 5000) {
                currentSpeedEl.classList.add('speed-excellent');
            } else if (speed > 1000) {
                currentSpeedEl.classList.add('speed-good');
            } else if (speed > 500) {
                currentSpeedEl.classList.add('speed-medium');
            } else if (speed > 100) {
                currentSpeedEl.classList.add('speed-slow');
            } else {
                currentSpeedEl.classList.add('speed-poor');
            }
        }
    }
    
    updateUploadStats() {
        if (!AppConfig.ENABLE_FILE_STATS) return;
        
        const now = Date.now();
        const recentSpeeds = this.speedHistory.filter(s => s.time > now - 2000);
        if (recentSpeeds.length > 0) {
            this.currentSpeed = recentSpeeds.reduce((sum, s) => sum + s.speed, 0) / recentSpeeds.length;
        }
        
        if (this.speedHistory.length > 0) {
            this.averageSpeed = this.speedHistory.reduce((sum, s) => sum + s.speed, 0) / this.speedHistory.length;
        }
        
        if (this.currentSpeed > this.peakSpeed) {
            this.peakSpeed = this.currentSpeed;
        }
        
        document.getElementById('current-speed').textContent = this.formatSpeed(this.currentSpeed);
        document.getElementById('avg-speed').textContent = this.formatSpeed(this.averageSpeed);
        document.getElementById('peak-speed').textContent = this.formatSpeed(this.peakSpeed);
        
        document.getElementById('current-speed-text').textContent = this.formatSpeed(this.currentSpeed);
        
        if (this.totalSize > 0) {
            const progress = (this.totalUploaded / this.totalSize) * 100;
            document.getElementById('overall-progress').style.width = `${progress}%`;
            document.getElementById('overall-percent').textContent = `${Math.round(progress)}%`;
        }
        
        document.getElementById('queue-count').textContent = this.uploadQueue.length + this.activeUploads.length;
    }
    
    formatSpeed(speed) {
        if (speed > 1024) {
            return `${(speed / 1024).toFixed(1)} MB/s`;
        }
        return `${Math.round(speed)} KB/s`;
    }
    
    formatTime(seconds) {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
    
    async handleFileUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        const maxSizeMB = Math.round(this.MAX_FILE_SIZE / (1024 * 1024));
        let addedCount = 0;
        
        for (let file of files) {
            if (file.size > this.MAX_FILE_SIZE) {
                this.showToast(
                    `"${file.name}" exceeds ${maxSizeMB}MB limit (${this.formatFileSize(file.size)})`, 
                    'error'
                );
                continue;
            }
            
            // Check total size for Realtime DB limits
            if (file.size > this.MAX_ALLOWED_SIZE) {
                this.showToast(
                    `"${file.name}" is too large. Max ${Math.round(this.MAX_ALLOWED_SIZE / (1024 * 1024))}MB.`, 
                    'error'
                );
                continue;
            }
            
            const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const fileItem = {
                id: fileId,
                file: file,
                status: 'pending',
                progress: 0,
                uploadedChunks: 0,
                totalChunks: Math.ceil(file.size / this.chunkSize),
                startTime: null,
                uploadedBytes: 0
            };
            
            this.uploadQueue.push(fileItem);
            this.addToQueueDisplay(fileItem);
            this.totalSize += file.size;
            addedCount++;
        }
        
        if (addedCount > 0) {
            this.updateQueueCount();
            this.showToast(`Added ${addedCount} file(s) to upload queue`, 'success');
            
            if (!this.isUploading && !this.isPaused && AppConfig.AUTO_UPLOAD) {
                this.processUploadQueue();
            }
        }
        
        event.target.value = '';
    }
    
    addToQueueDisplay(fileItem) {
        const queueList = document.getElementById('queue-list');
        const queueItem = document.createElement('div');
        queueItem.className = 'queue-item';
        queueItem.id = `queue-${fileItem.id}`;
        queueItem.innerHTML = `
            <div class="queue-item-info">
                <div class="queue-file-icon">
                    <i class="${this.getFileIcon(this.getFileType(fileItem.file.name))}"></i>
                </div>
                <div class="queue-file-details">
                    <div class="queue-file-name">${fileItem.file.name}</div>
                    <div class="queue-file-size">${this.formatFileSize(fileItem.file.size)}</div>
                </div>
            </div>
            <div class="queue-status pending">Pending</div>
        `;
        queueList.appendChild(queueItem);
    }
    
    updateQueueItem(fileItem) {
        const queueItem = document.getElementById(`queue-${fileItem.id}`);
        if (!queueItem) return;
        
        const statusEl = queueItem.querySelector('.queue-status');
        statusEl.className = 'queue-status ' + fileItem.status;
        statusEl.textContent = fileItem.status.charAt(0).toUpperCase() + fileItem.status.slice(1);
        
        if (fileItem.status === 'uploading') {
            const fileSize = queueItem.querySelector('.queue-file-size');
            if (fileSize) {
                fileSize.textContent = `${this.formatFileSize(fileItem.uploadedBytes)} / ${this.formatFileSize(fileItem.file.size)}`;
            }
        }
        
        if (fileItem.status === 'completed') {
            setTimeout(() => {
                if (queueItem.parentNode) {
                    queueItem.parentNode.removeChild(queueItem);
                }
            }, 2000);
        }
    }
    
    updateQueueCount() {
        document.getElementById('queue-count').textContent = this.uploadQueue.length + this.activeUploads.length;
    }
    
    async processUploadQueue() {
        if (this.isPaused || this.uploadQueue.length === 0) {
            this.isUploading = false;
            return;
        }
        
        this.isUploading = true;
        
        if (!this.uploadStartTime) {
            this.uploadStartTime = Date.now();
        }
        
        document.getElementById('current-upload').classList.add('active');
        
        while (this.activeUploads.length < this.maxParallelUploads && this.uploadQueue.length > 0) {
            const fileItem = this.uploadQueue.shift();
            fileItem.status = 'uploading';
            fileItem.startTime = Date.now();
            this.activeUploads.push(fileItem);
            this.updateQueueItem(fileItem);
            this.uploadFile(fileItem);
        }
        
        if (!this.statsInterval) {
            this.statsInterval = setInterval(() => this.updateUploadStats(), 1000);
        }
    }
    
    async uploadFile(fileItem) {
        const file = fileItem.file;
        
        this.updateCurrentUploadDisplay(fileItem);
        
        try {
            // Read file as base64
            const base64Data = await this.readFileAsBase64(file);
            
            // Calculate upload speed (simulated)
            const startTime = Date.now();
            const fileSizeKB = file.size / 1024;
            
            // Upload to Realtime Database
            await this.saveFileToRealtimeDB(fileItem, base64Data);
            
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            const speed = fileSizeKB / duration;
            
            this.speedHistory.push({
                time: Date.now(),
                speed: speed
            });
            
            // Keep only recent 50 speed records
            if (this.speedHistory.length > 50) {
                this.speedHistory.shift();
            }
            
            fileItem.status = 'completed';
            fileItem.progress = 100;
            fileItem.uploadedBytes = file.size;
            
            this.totalUploaded += file.size;
            
            this.updateCurrentUploadDisplay(fileItem);
            this.updateQueueItem(fileItem);
            
            this.showToast(`Uploaded: ${file.name}`, 'success');
            
            // Reload files list
            await this.loadFiles();
            
        } catch (error) {
            console.error('Upload error:', error);
            fileItem.status = 'error';
            this.updateQueueItem(fileItem);
            this.showToast(`Upload failed: ${file.name}`, 'error');
        } finally {
            const index = this.activeUploads.indexOf(fileItem);
            if (index > -1) {
                this.activeUploads.splice(index, 1);
            }
            
            this.processUploadQueue();
            
            if (this.activeUploads.length === 0 && this.uploadQueue.length === 0) {
                document.getElementById('current-upload').classList.remove('active');
                this.uploadStartTime = null;
                this.totalUploaded = 0;
                this.totalSize = 0;
                this.currentSpeed = 0;
                this.averageSpeed = 0;
                this.peakSpeed = 0;
                this.speedHistory = [];
                
                if (this.statsInterval) {
                    clearInterval(this.statsInterval);
                    this.statsInterval = null;
                }
            }
        }
    }
    
    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    async saveFileToRealtimeDB(fileItem, base64Data) {
        if (!this.currentUser || !window.firebaseApp || !window.firebaseApp.db) {
            throw new Error('Not authenticated or database not initialized');
        }
        
        const file = fileItem.file;
        const fileType = this.getFileType(file.name);
        const fileId = fileItem.id;
        
        // Save file metadata and data to Realtime Database
        const filePath = `users/${this.currentUser.uid}/files/${fileId}`;
        
        await window.firebaseApp.db.ref(filePath).set({
            id: fileId,
            name: file.name,
            type: fileType,
            size: file.size,
            data: base64Data,
            mimeType: file.type,
            uploadedAt: Date.now(),
            chunks: 1,
            compressed: false
        });
        
        return true;
    }
    
    updateCurrentUploadDisplay(fileItem) {
        if (!fileItem) return;
        
        document.getElementById('current-file-name').textContent = fileItem.file.name;
        document.getElementById('current-file-size').textContent = 
            `${this.formatFileSize(fileItem.uploadedBytes)} / ${this.formatFileSize(fileItem.file.size)}`;
        document.getElementById('current-percent').textContent = `${Math.round(fileItem.progress)}%`;
        document.getElementById('current-progress-text').textContent = 
            `Uploading to Realtime DB`;
        
        document.getElementById('current-progress-bar').style.width = `${fileItem.progress}%`;
        
        if (fileItem.startTime) {
            const elapsedSeconds = (Date.now() - fileItem.startTime) / 1000;
            document.getElementById('elapsed-time').textContent = this.formatTime(elapsedSeconds);
            
            if (fileItem.progress > 0) {
                const remainingSeconds = (elapsedSeconds / fileItem.progress) * (100 - fileItem.progress);
                document.getElementById('remaining-time').textContent = this.formatTime(remainingSeconds);
            }
        }
    }
    
    cancelAllUploads() {
        this.activeUploads.forEach(fileItem => {
            fileItem.status = 'cancelled';
            this.updateQueueItem(fileItem);
        });
        
        this.activeUploads = [];
        
        document.getElementById('current-upload').classList.remove('active');
        this.showToast('All uploads cancelled', 'warning');
        
        this.uploadStartTime = null;
        this.totalUploaded = 0;
        this.totalSize = 0;
        this.currentSpeed = 0;
        this.averageSpeed = 0;
        this.peakSpeed = 0;
        this.speedHistory = [];
        
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }
    
    pauseUpload() {
        this.isPaused = true;
        document.getElementById('pause-upload').style.display = 'none';
        document.getElementById('resume-upload').style.display = 'flex';
        this.showToast('Uploads paused', 'info');
    }
    
    resumeUpload() {
        this.isPaused = false;
        document.getElementById('pause-upload').style.display = 'flex';
        document.getElementById('resume-upload').style.display = 'none';
        this.showToast('Uploads resumed', 'success');
        this.processUploadQueue();
    }
    
    clearUploadQueue() {
        this.uploadQueue = [];
        this.cancelAllUploads();
        document.getElementById('queue-list').innerHTML = '';
        this.updateQueueCount();
        this.showToast('Upload queue cleared', 'info');
    }
    
    async checkAuthState() {
        try {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    console.log("✅ User authenticated:", user.email);
                    this.currentUser = user;
                    
                    // Load user profile data
                    try {
                        const profileSnapshot = await window.firebaseApp.db.ref(`users/${user.uid}/profile`).once('value');
                        if (profileSnapshot.exists()) {
                            const profile = profileSnapshot.val();
                            document.getElementById('display-username').textContent = profile.username || user.email.split('@')[0];
                            document.getElementById('user-phone').textContent = profile.phone || 'Not set';
                        } else {
                            document.getElementById('display-username').textContent = user.email.split('@')[0];
                            document.getElementById('user-phone').textContent = 'Not set';
                        }
                    } catch (error) {
                        console.error('Profile load error:', error);
                        document.getElementById('display-username').textContent = user.email.split('@')[0];
                    }
                    
                    await this.loadUserSettings();
                    await this.loadFiles();
                    this.showApp();
                    this.showToast('Welcome back!', 'success');
                } else {
                    console.log("No user logged in");
                    this.showAuth();
                }
            });
        } catch (error) {
            console.error('Auth state check error:', error);
            this.showToast('Authentication error occurred', 'error');
        }
    }
    
    async loadUserSettings() {
        if (!this.currentUser || !window.firebaseApp || !window.firebaseApp.db) return;
        
        try {
            const snapshot = await window.firebaseApp.db.ref(`users/${this.currentUser.uid}/settings`).once('value');
            if (snapshot.exists()) {
                const settings = snapshot.val();
                
                if (settings.maxFileSize) {
                    this.MAX_FILE_SIZE = Math.min(settings.maxFileSize, this.MAX_ALLOWED_SIZE);
                }
                
                if (settings.chunkSize) {
                    this.chunkSize = settings.chunkSize;
                    const chunkSizeKB = Math.floor(settings.chunkSize / 1024);
                    document.getElementById('chunk-size').value = chunkSizeKB;
                }
                
                this.updateFileSizeDisplay();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    updateFileSizeDisplay() {
        const sizeInMB = Math.round(this.MAX_FILE_SIZE / (1024 * 1024));
        const fileSizeInfo = document.getElementById('file-size-info');
        if (fileSizeInfo) {
            fileSizeInfo.textContent = `Upload to Firebase Realtime DB (max ${sizeInMB}MB)`;
        }
        
        const sizeSlider = document.getElementById('max-file-size');
        const sizeValue = document.getElementById('size-value');
        if (sizeSlider && sizeValue) {
            const sliderValue = Math.min(Math.max(1, sizeInMB), 10);
            sizeSlider.value = sliderValue;
            sizeValue.textContent = `${sliderValue} MB`;
            
            // Update preset buttons
            document.querySelectorAll('.size-preset').forEach(preset => {
                preset.classList.remove('active');
                if (parseInt(preset.dataset.size) === sliderValue) {
                    preset.classList.add('active');
                }
            });
        }
    }
    
    async loadFiles() {
        if (!this.currentUser || !window.firebaseApp || !window.firebaseApp.db) return;
        
        try {
            const snapshot = await window.firebaseApp.db.ref(`users/${this.currentUser.uid}/files`).once('value');
            this.files = [];
            
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const fileData = childSnapshot.val();
                    fileData.id = childSnapshot.key;
                    this.files.push(fileData);
                });
            }
            
            this.files.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
            
            this.updateDashboardStats();
            this.loadRecentFiles();
            if (this.currentSection === 'documents') {
                this.loadDocumentsTable();
            }
        } catch (error) {
            console.error('Error loading files:', error);
        }
    }
    
    updateDashboardStats() {
        if (!AppConfig.ENABLE_FILE_STATS) return;
        
        const counts = { code: 0, document: 0, image: 0, video: 0, other: 0 };
        
        this.files.forEach(file => {
            if (counts[file.type] !== undefined) {
                counts[file.type]++;
            } else {
                counts.other++;
            }
        });
        
        document.getElementById('code-count').textContent = counts.code;
        document.getElementById('doc-count').textContent = counts.document;
        document.getElementById('img-count').textContent = counts.image;
        document.getElementById('video-count').textContent = counts.video;
    }
    
    loadRecentFiles() {
        const recentFilesList = document.getElementById('recent-files-list');
        recentFilesList.innerHTML = '';
        
        const recentFiles = this.files.slice(0, 6);
        
        if (recentFiles.length === 0) {
            recentFilesList.innerHTML = `
                <div class="empty-state royal-glass" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: ${AppConfig.PRIMARY_COLOR}; margin-bottom: 20px;"></i>
                    <h3>No files yet</h3>
                    <p>Upload your first file to get started</p>
                </div>
            `;
            return;
        }
        
        recentFiles.forEach(file => {
            const fileCard = document.createElement('div');
            fileCard.className = 'file-card';
            fileCard.dataset.fileId = file.id;
            fileCard.innerHTML = `
                <div class="file-icon">
                    <i class="${this.getFileIcon(file.type)}"></i>
                </div>
                <div class="file-name">${this.truncateFileName(file.name, 20)}</div>
                <div class="file-type">${this.getFileTypeLabel(file.type)}</div>
            `;
            fileCard.addEventListener('click', () => this.previewFile(file.id));
            recentFilesList.appendChild(fileCard);
        });
    }
    
    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const codeExtensions = ['ino', 'cpp', 'c', 'h', 'py', 'js', 'java', 'html', 'css', 'json'];
        const docExtensions = ['docx', 'pdf', 'txt', 'rtf', 'doc', 'odt'];
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'];
        const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'webm'];
        
        if (codeExtensions.includes(ext)) return 'code';
        if (docExtensions.includes(ext)) return 'document';
        if (imageExtensions.includes(ext)) return 'image';
        if (videoExtensions.includes(ext)) return 'video';
        return 'other';
    }
    
    getFileIcon(type) {
        const icons = {
            code: 'fas fa-file-code',
            document: 'fas fa-file-word',
            image: 'fas fa-image',
            video: 'fas fa-video',
            other: 'fas fa-file'
        };
        return icons[type] || icons.other;
    }
    
    getFileTypeLabel(type) {
        const labels = {
            code: 'Code File',
            document: 'Document',
            image: 'Image',
            video: 'Video',
            other: 'Other'
        };
        return labels[type] || type;
    }
    
    truncateFileName(name, maxLength) {
        if (name.length <= maxLength) return name;
        return name.substr(0, maxLength) + '...';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async previewFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;
        
        const modal = document.getElementById('preview-modal');
        const title = document.getElementById('preview-title');
        const body = document.getElementById('preview-body');
        
        title.textContent = file.name;
        title.dataset.fileId = file.id;
        body.innerHTML = this.getPreviewContent(file);
        
        modal.classList.add('active');
    }
    
    getPreviewContent(file) {
        if (!AppConfig.ENABLE_FILE_PREVIEW) {
            return this.getFileInfoHtml(file);
        }
        
        let content = '';
        
        if (file.type === 'image' && file.mimeType && file.mimeType.startsWith('image/')) {
            try {
                content = `<img src="data:${file.mimeType};base64,${file.data}" alt="${file.name}" 
                         style="max-width:100%; max-height:400px; border-radius:10px; margin: 0 auto; display: block;">`;
            } catch (e) {
                content = this.getFileInfoHtml(file);
            }
        } else if (file.type === 'document' || file.type === 'code') {
            try {
                const text = atob(file.data);
                if (text.length < 5000) {
                    content = `
                        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; max-height: 300px; overflow-y: auto;">
                            <pre style="color: white; font-family: monospace; white-space: pre-wrap;">${this.escapeHtml(text)}</pre>
                        </div>
                    `;
                } else {
                    content = this.getFileInfoHtml(file);
                }
            } catch (e) {
                content = this.getFileInfoHtml(file);
            }
        } else {
            content = this.getFileInfoHtml(file);
        }
        
        return content;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getFileInfoHtml(file) {
        const date = file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : 'N/A';
        const size = this.formatFileSize(file.size || 0);
        
        return `
            <div class="file-info-details">
                <div class="info-row">
                    <strong>Type:</strong> ${this.getFileTypeLabel(file.type)}
                </div>
                <div class="info-row">
                    <strong>Size:</strong> ${size}
                </div>
                <div class="info-row">
                    <strong>Uploaded:</strong> ${date}
                </div>
                <div class="preview-notice" style="margin-top: 20px; padding: 15px; background: rgba(255,215,0,0.1); border-radius: 10px;">
                    <i class="fas fa-info-circle" style="color: ${AppConfig.ACCENT_COLOR};"></i>
                    <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9);">
                        Preview not available for this file type. Click download to save the file.
                    </p>
                </div>
            </div>
        `;
    }
    
    async downloadFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;
        
        try {
            const byteCharacters = atob(file.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: file.mimeType || 'application/octet-stream' });
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showToast(`Downloaded: ${file.name}`, 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Download failed', 'error');
        }
    }
    
    // DELETE FILE FUNCTION
    async deleteFile(fileId) {
        if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
            return;
        }
        
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;
        
        try {
            // Delete from Firebase
            await window.firebaseApp.db.ref(`users/${this.currentUser.uid}/files/${fileId}`).remove();
            
            // Delete any associated share links
            await this.deleteFileShares(fileId);
            
            // Remove from local array
            this.files = this.files.filter(f => f.id !== fileId);
            
            // Close modal if open
            this.closeModal();
            
            // Update UI
            this.loadDocumentsTable();
            this.loadRecentFiles();
            this.updateDashboardStats();
            
            this.showToast(`Deleted: ${file.name}`, 'success');
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('Delete failed', 'error');
        }
    }
    
    async deleteFileShares(fileId) {
        try {
            const sharesSnapshot = await window.firebaseApp.db.ref(`users/${this.currentUser.uid}/shares`).once('value');
            if (sharesSnapshot.exists()) {
                const deletePromises = [];
                sharesSnapshot.forEach((shareSnapshot) => {
                    const shareData = shareSnapshot.val();
                    if (shareData.fileId === fileId) {
                        deletePromises.push(
                            window.firebaseApp.db.ref(`users/${this.currentUser.uid}/shares/${shareSnapshot.key}`).remove()
                        );
                    }
                });
                await Promise.all(deletePromises);
            }
        } catch (error) {
            console.error('Error deleting shares:', error);
        }
    }
    
    // SHARE LINK GENERATION
    async generateShare(file) {
        if (!AppConfig.ENABLE_SHARING) {
            this.showToast('File sharing is disabled', 'error');
            return;
        }
        
        const sharePreviewContainer = document.getElementById('share-preview-container');
        
        // Clear previous content
        sharePreviewContainer.innerHTML = '';
        
        try {
            // Create a shareable URL
            const shareableUrl = `${window.location.origin}/share.html?file=${file.id}&user=${this.currentUser.uid}`;
            
            const shareDisplayContent = document.createElement('div');
            shareDisplayContent.className = 'share-display-content';
            shareDisplayContent.innerHTML = `
                <div style="text-align: center;">
                    <div style="width:100%; padding: 25px; background: rgba(${parseInt(AppConfig.PRIMARY_COLOR.slice(1, 3), 16)}, ${parseInt(AppConfig.PRIMARY_COLOR.slice(3, 5), 16)}, ${parseInt(AppConfig.PRIMARY_COLOR.slice(5, 7), 16)}, 0.2); border-radius: 15px; margin-bottom: 25px;">
                        <i class="fas fa-link" style="font-size: 4rem; color: ${AppConfig.ACCENT_COLOR}; margin-bottom: 20px;"></i>
                        <h4 style="color: white; margin: 15px 0 10px 0;">${this.truncateFileName(file.name, 25)}</h4>
                        <div class="share-info" style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
                            <p style="font-size: 1rem; margin: 8px 0;"><strong>File:</strong> ${file.name}</p>
                            <p style="font-size: 1rem; margin: 8px 0;"><strong>Type:</strong> ${this.getFileTypeLabel(file.type)}</p>
                            <p style="font-size: 1rem; margin: 8px 0;"><strong>Size:</strong> ${this.formatFileSize(file.size)}</p>
                            <p style="font-size: 1rem; margin: 8px 0; word-break: break-all;">
                                <strong>Share Link:</strong><br>
                                <span style="color: ${AppConfig.PRIMARY_COLOR}; font-size: 0.9rem; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; display: block; margin-top: 5px;">${shareableUrl}</span>
                            </p>
                        </div>
                        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                            <button class="btn royal-btn copy-share-link-btn" style="flex: 1; min-width: 180px;">
                                <i class="fas fa-copy"></i> Copy Link
                            </button>
                            <button class="btn btn-secondary test-share-btn" style="flex: 1; min-width: 180px;">
                                <i class="fas fa-external-link-alt"></i> Test Link
                            </button>
                        </div>
                        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.7); margin-top: 20px;">
                            <i class="fas fa-info-circle"></i> Share this link with anyone to give them access to download this file
                        </p>
                    </div>
                </div>
            `;
            
            sharePreviewContainer.appendChild(shareDisplayContent);
            
            // Add event listeners
            shareDisplayContent.querySelector('.copy-share-link-btn').addEventListener('click', () => {
                this.copyToClipboard(shareableUrl);
                this.showToast('Share link copied to clipboard!', 'success');
            });
            
            shareDisplayContent.querySelector('.test-share-btn').addEventListener('click', () => {
                window.open(shareableUrl, '_blank');
                this.showToast('Opening share link in new tab...', 'info');
            });
            
            // Save share link to database
            this.saveShareLink(file, shareableUrl);
            
            this.showToast('Share link generated successfully!', 'success');
            
        } catch (error) {
            console.error('Share link generation error:', error);
            this.showShareFallback(file);
        }
    }
    
    showShareFallback(file) {
        const sharePreviewContainer = document.getElementById('share-preview-container');
        sharePreviewContainer.innerHTML = '';
        
        const shareDisplayContent = document.createElement('div');
        shareDisplayContent.className = 'share-display-content';
        shareDisplayContent.innerHTML = `
            <div style="text-align: center;">
                <div style="width:100%; padding: 25px; background: rgba(${parseInt(AppConfig.PRIMARY_COLOR.slice(1, 3), 16)}, ${parseInt(AppConfig.PRIMARY_COLOR.slice(3, 5), 16)}, ${parseInt(AppConfig.PRIMARY_COLOR.slice(5, 7), 16)}, 0.2); border-radius: 15px; margin-bottom: 25px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: ${AppConfig.ACCENT_COLOR}; margin-bottom: 20px;"></i>
                    <h4 style="color: white; margin: 15px 0 10px 0;">${this.truncateFileName(file.name, 25)}</h4>
                    <div class="share-info" style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
                        <p style="font-size: 1rem; margin: 8px 0;"><strong>Note:</strong> Manual sharing</p>
                        <p style="font-size: 1rem; margin: 8px 0;">
                            Share this file using the direct download button.
                        </p>
                    </div>
                    <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <button class="btn royal-btn download-direct-btn" style="flex: 1; min-width: 180px;">
                            <i class="fas fa-download"></i> Download File
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        sharePreviewContainer.appendChild(shareDisplayContent);
        
        // Add event listeners
        shareDisplayContent.querySelector('.download-direct-btn').addEventListener('click', () => {
            this.downloadFile(file.id);
        });
    }
    
    async saveShareLink(file, shareableUrl) {
        try {
            const shareId = 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            await window.firebaseApp.db.ref(`users/${this.currentUser.uid}/shares/${shareId}`).set({
                fileId: file.id,
                fileName: file.name,
                shareableUrl: shareableUrl,
                generatedAt: Date.now()
            });
            
            // Also update share links list display
            this.updateShareLinksList(file, shareableUrl, shareId);
            
        } catch (error) {
            console.error('Error saving share link:', error);
        }
    }
    
    updateShareLinksList(file, shareableUrl, shareId) {
        const shareLinksList = document.getElementById('share-links-list');
        
        // Remove "no share links" message if present
        const emptyMsg = shareLinksList.querySelector('.empty-state');
        if (emptyMsg) {
            emptyMsg.remove();
        }
        
        const shareItem = document.createElement('div');
        shareItem.className = 'share-item';
        shareItem.id = `share-item-${shareId}`;
        shareItem.innerHTML = `
            <div class="share-item-header">
                <h4>${this.truncateFileName(file.name, 15)}</h4>
                <span class="share-date">${new Date().toLocaleDateString()}</span>
            </div>
            <div class="share-url-preview">
                <span>${this.truncateText(shareableUrl, 30)}</span>
            </div>
            <div class="share-actions" style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="btn royal-btn copy-share-link-small" style="flex: 1; padding: 10px; font-size: 0.9rem;">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <button class="btn btn-secondary test-share-link" style="flex: 1; padding: 10px; font-size: 0.9rem;">
                    <i class="fas fa-external-link-alt"></i> Test
                </button>
                <button class="btn btn-danger delete-share" style="flex: 1; padding: 10px; font-size: 0.9rem;">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        
        shareLinksList.prepend(shareItem);
        
        // Add event listeners for the new share item
        shareItem.querySelector('.copy-share-link-small').addEventListener('click', () => {
            this.copyToClipboard(shareableUrl);
            this.showToast('Share link copied to clipboard!', 'success');
        });
        
        shareItem.querySelector('.test-share-link').addEventListener('click', () => {
            window.open(shareableUrl, '_blank');
            this.showToast('Opening share link...', 'info');
        });
        
        shareItem.querySelector('.delete-share').addEventListener('click', async () => {
            if (confirm('Delete this share link?')) {
                try {
                    await window.firebaseApp.db.ref(`users/${this.currentUser.uid}/shares/${shareId}`).remove();
                    shareItem.remove();
                    
                    // If no more share links, show empty message
                    if (shareLinksList.children.length === 0) {
                        shareLinksList.innerHTML = `
                            <div class="empty-state royal-glass" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                                <i class="fas fa-link" style="font-size: 3rem; color: ${AppConfig.PRIMARY_COLOR}; margin-bottom: 20px;"></i>
                                <h3>No share links yet</h3>
                                <p>Generate your first share link for a file</p>
                            </div>
                        `;
                    }
                    
                    this.showToast('Share link deleted', 'info');
                } catch (error) {
                    console.error('Error deleting share link:', error);
                    this.showToast('Delete failed', 'error');
                }
            }
        });
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }
    
    copyToClipboard(text) {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (error) {
            console.error('Copy to clipboard error:', error);
            return false;
        }
    }
    
    async loadShareLinks() {
        if (!this.currentUser || !window.firebaseApp || !window.firebaseApp.db) return;
        
        try {
            const snapshot = await window.firebaseApp.db.ref(`users/${this.currentUser.uid}/shares`).once('value');
            const shareLinksList = document.getElementById('share-links-list');
            shareLinksList.innerHTML = '';
            
            if (!snapshot.exists()) {
                shareLinksList.innerHTML = `
                    <div class="empty-state royal-glass" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                        <i class="fas fa-link" style="font-size: 3rem; color: ${AppConfig.PRIMARY_COLOR}; margin-bottom: 20px;"></i>
                        <h3>No share links yet</h3>
                        <p>Generate your first share link for a file</p>
                    </div>
                `;
                return;
            }
            
            snapshot.forEach((childSnapshot) => {
                const shareData = childSnapshot.val();
                const shareItem = document.createElement('div');
                shareItem.className = 'share-item';
                shareItem.id = `share-item-${childSnapshot.key}`;
                shareItem.innerHTML = `
                    <div class="share-item-header">
                        <h4>${this.truncateFileName(shareData.fileName, 15)}</h4>
                        <span class="share-date">${new Date(shareData.generatedAt).toLocaleDateString()}</span>
                    </div>
                    <div class="share-url-preview">
                        <span>${this.truncateText(shareData.shareableUrl, 30)}</span>
                    </div>
                    <div class="share-actions" style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn royal-btn copy-share-link-small" style="flex: 1; padding: 10px; font-size: 0.9rem;">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        <button class="btn btn-secondary test-share-link" style="flex: 1; padding: 10px; font-size: 0.9rem;">
                            <i class="fas fa-external-link-alt"></i> Test
                        </button>
                        <button class="btn btn-danger delete-share" style="flex: 1; padding: 10px; font-size: 0.9rem;">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                `;
                
                shareLinksList.appendChild(shareItem);
                
                // Add event listeners
                shareItem.querySelector('.copy-share-link-small').addEventListener('click', () => {
                    this.copyToClipboard(shareData.shareableUrl);
                    this.showToast('Share link copied to clipboard!', 'success');
                });
                
                shareItem.querySelector('.test-share-link').addEventListener('click', () => {
                    window.open(shareData.shareableUrl, '_blank');
                    this.showToast('Opening share link...', 'info');
                });
                
                shareItem.querySelector('.delete-share').addEventListener('click', async () => {
                    if (confirm('Delete this share link?')) {
                        try {
                            await window.firebaseApp.db.ref(`users/${this.currentUser.uid}/shares/${childSnapshot.key}`).remove();
                            shareItem.remove();
                            
                            // If no more share links, show empty message
                            if (shareLinksList.children.length === 0) {
                                shareLinksList.innerHTML = `
                                    <div class="empty-state royal-glass" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                                        <i class="fas fa-link" style="font-size: 3rem; color: ${AppConfig.PRIMARY_COLOR}; margin-bottom: 20px;"></i>
                                        <h3>No share links yet</h3>
                                        <p>Generate your first share link for a file</p>
                                    </div>
                                `;
                            }
                            
                            this.showToast('Share link deleted', 'info');
                        } catch (error) {
                            console.error('Error deleting share link:', error);
                            this.showToast('Delete failed', 'error');
                        }
                    }
                });
            });
            
        } catch (error) {
            console.error('Error loading share links:', error);
        }
    }
    
    async updateProfile() {
        const newUsername = document.getElementById('new-username').value.trim();
        const newPassword = document.getElementById('new-password').value;
        const maxFileSizeMB = parseInt(document.getElementById('max-file-size').value) || 1;
        const chunkSizeKB = parseInt(document.getElementById('chunk-size').value) || 256;
        
        try {
            const newMaxFileSize = Math.min(maxFileSizeMB * 1024 * 1024, this.MAX_ALLOWED_SIZE);
            
            await window.firebaseApp.db.ref(`users/${this.currentUser.uid}/settings`).update({
                maxFileSize: newMaxFileSize,
                chunkSize: chunkSizeKB * 1024,
                lastUpdated: Date.now()
            });
            
            this.MAX_FILE_SIZE = newMaxFileSize;
            this.chunkSize = chunkSizeKB * 1024;
            this.updateFileSizeDisplay();
            
            if (newUsername) {
                await window.firebaseApp.db.ref(`users/${this.currentUser.uid}/profile`).update({
                    username: newUsername,
                    updatedAt: Date.now()
                });
                document.getElementById('display-username').textContent = newUsername;
                document.getElementById('new-username').value = '';
                this.showToast('Username updated', 'success');
            }
            
            if (newPassword) {
                if (newPassword.length < AppConfig.PASSWORD_MIN_LENGTH) {
                    this.showToast(`Password must be at least ${AppConfig.PASSWORD_MIN_LENGTH} characters`, 'error');
                    return;
                }
                await this.currentUser.updatePassword(newPassword);
                document.getElementById('new-password').value = '';
                this.showToast('Password updated successfully!', 'success');
            }
            
            if (!newUsername && !newPassword) {
                this.showToast('Settings saved successfully!', 'success');
            }
            
        } catch (error) {
            console.error('Update error:', error);
            this.showToast('Update failed: ' + error.message, 'error');
        }
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'flex';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 5000);
    }
    
    toggleAuth(mode) {
        const loginToggle = document.getElementById('login-toggle');
        const signupToggle = document.getElementById('signup-toggle');
        const authSubmit = document.getElementById('auth-submit');
        const phoneGroup = document.getElementById('phone-group');
        
        if (mode === 'login') {
            loginToggle.classList.add('active');
            signupToggle.classList.remove('active');
            authSubmit.textContent = 'Login';
            phoneGroup.style.display = 'none';
        } else {
            signupToggle.classList.add('active');
            loginToggle.classList.remove('active');
            authSubmit.textContent = 'Sign Up';
            phoneGroup.style.display = 'block';
        }
    }
    
    async handleAuth(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const isLogin = document.getElementById('login-toggle').classList.contains('active');
        
        if (!username || !password) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        if (!isLogin && !phone) {
            this.showToast('Phone number is required for signup', 'error');
            return;
        }
        
        try {
            // Generate email from username and phone
            const cleanUsername = username.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
            const cleanPhone = phone.replace(/\D/g, '');
            const email = `${cleanUsername}.${cleanPhone}@royalvault.app`;
            
            if (isLogin) {
                // Login user
                const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                this.currentUser = userCredential.user;
                
                // Load profile data
                const profileSnapshot = await window.firebaseApp.db.ref(`users/${this.currentUser.uid}/profile`).once('value');
                if (profileSnapshot.exists()) {
                    const profile = profileSnapshot.val();
                    document.getElementById('display-username').textContent = profile.username || cleanUsername;
                    document.getElementById('user-phone').textContent = profile.phone || cleanPhone;
                } else {
                    document.getElementById('display-username').textContent = cleanUsername;
                    document.getElementById('user-phone').textContent = cleanPhone;
                }
                
                this.showToast('Login successful!', 'success');
                await this.loadUserSettings();
                await this.loadFiles();
                this.showApp();
                
            } else {
                // Sign up new user
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                this.currentUser = userCredential.user;
                
                // Create user profile in Realtime Database
                await window.firebaseApp.db.ref(`users/${this.currentUser.uid}/profile`).set({
                    username: username,
                    phone: phone,
                    email: email,
                    createdAt: Date.now()
                });
                
                // Create default settings
                await window.firebaseApp.db.ref(`users/${this.currentUser.uid}/settings`).set({
                    maxFileSize: this.MAX_FILE_SIZE,
                    chunkSize: this.chunkSize,
                    createdAt: Date.now()
                });
                
                document.getElementById('display-username').textContent = username;
                document.getElementById('user-phone').textContent = phone;
                
                this.showToast('Account created successfully!', 'success');
                this.showApp();
            }
            
            // Clear form
            document.getElementById('username').value = '';
            document.getElementById('phone').value = '';
            document.getElementById('password').value = '';
            
        } catch (error) {
            console.error('Auth error:', error);
            let errorMessage = 'Authentication failed';
            
            switch(error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email already in use. Try logging in instead.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email format. Please check your username and phone number.';
                    break;
                case 'auth/weak-password':
                    errorMessage = `Password should be at least ${AppConfig.PASSWORD_MIN_LENGTH} characters long.`;
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'No account found. Please sign up first.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password. Please try again.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your internet connection.';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Email/password authentication is not enabled. Please contact support.';
                    break;
                default:
                    errorMessage = `Error: ${error.message}`;
            }
            
            this.showToast(errorMessage, 'error');
        }
    }
    
    async logout() {
        try {
            await firebase.auth().signOut();
            this.currentUser = null;
            this.files = [];
            this.showAuth();
            this.showToast('Logged out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Logout failed', 'error');
        }
    }
    
    showApp() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        this.switchSection('dashboard');
    }
    
    showAuth() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }
    
    switchSection(section) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const navItem = document.querySelector(`[data-section="${section}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        const contentSection = document.getElementById(section);
        if (contentSection) {
            contentSection.classList.add('active');
        }
        
        const title = section.charAt(0).toUpperCase() + section.slice(1);
        document.getElementById('page-title').textContent = title;
        
        this.currentSection = section;
        
        if (section === 'documents') {
            this.loadDocumentsTable();
        } else if (section === 'share-links') {
            this.populateShareFileSelect();
            this.loadShareLinks();
        }
    }
    
    loadDocumentsTable() {
        const tbody = document.getElementById('documents-table-body');
        tbody.innerHTML = '';
        
        if (this.files.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <i class="fas fa-inbox" style="font-size: 3rem; color: ${AppConfig.PRIMARY_COLOR}; margin-bottom: 15px; display: block;"></i>
                        <h3>No documents yet</h3>
                        <p>Start by uploading some files</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        this.files.forEach(file => {
            const row = document.createElement('tr');
            const size = this.formatFileSize(file.size || 0);
            const date = file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'N/A';
            
            row.innerHTML = `
                <td>${this.truncateFileName(file.name, 30)}</td>
                <td><span class="file-tag">${this.getFileTypeLabel(file.type)}</span></td>
                <td>${size}</td>
                <td>${date}</td>
                <td>
                    <button class="action-btn preview-btn" data-file-id="${file.id}" title="Preview">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn download-btn" data-file-id="${file.id}" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-btn share-btn" data-file-id="${file.id}" title="Generate Share Link">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    <button class="action-btn delete-btn" data-file-id="${file.id}" title="Delete File">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        this.attachTableEventListeners();
    }
    
    attachTableEventListeners() {
        const tbody = document.getElementById('documents-table-body');
        
        tbody.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.previewFile(btn.dataset.fileId);
            });
        });
        
        tbody.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadFile(btn.dataset.fileId);
            });
        });
        
        tbody.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.generateFileShareLink(btn.dataset.fileId);
            });
        });
        
        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteFile(btn.dataset.fileId);
            });
        });
    }
    
    async generateFileShareLink(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;
        
        await this.generateShare(file);
        this.switchSection('share-links');
    }
    
    async generateShareLink() {
        const fileId = document.getElementById('share-file-select').value;
        if (!fileId) {
            this.showToast('Please select a file first', 'error');
            return;
        }
        
        const file = this.files.find(f => f.id === fileId);
        if (!file) {
            this.showToast('File not found', 'error');
            return;
        }
        
        await this.generateShare(file);
    }
    
    populateShareFileSelect() {
        const select = document.getElementById('share-file-select');
        select.innerHTML = '<option value="">Select a file</option>';
        
        this.files.forEach(file => {
            const option = document.createElement('option');
            option.value = file.id;
            option.textContent = this.truncateFileName(file.name, 30);
            select.appendChild(option);
        });
    }
    
    searchFiles(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) {
            this.loadDocumentsTable();
            return;
        }
        
        const filteredFiles = this.files.filter(file => 
            file.name.toLowerCase().includes(searchTerm) ||
            file.type.toLowerCase().includes(searchTerm)
        );
        
        this.displayFilteredFiles(filteredFiles);
    }
    
    displayFilteredFiles(files) {
        const tbody = document.getElementById('documents-table-body');
        tbody.innerHTML = '';
        
        if (files.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <i class="fas fa-search" style="font-size: 3rem; color: ${AppConfig.PRIMARY_COLOR}; margin-bottom: 15px; display: block;"></i>
                        <h3>No files found</h3>
                        <p>Try a different search term</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const searchTerm = document.getElementById('search-input').value;
        
        files.forEach(file => {
            const row = document.createElement('tr');
            const size = this.formatFileSize(file.size || 0);
            const date = file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'N/A';
            
            row.innerHTML = `
                <td>${this.highlightText(file.name, searchTerm)}</td>
                <td><span class="file-tag">${this.getFileTypeLabel(file.type)}</span></td>
                <td>${size}</td>
                <td>${date}</td>
                <td>
                    <button class="action-btn preview-btn" data-file-id="${file.id}" title="Preview">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn download-btn" data-file-id="${file.id}" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-btn share-btn" data-file-id="${file.id}" title="Generate Share Link">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    <button class="action-btn delete-btn" data-file-id="${file.id}" title="Delete File">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        this.attachTableEventListeners();
    }
    
    highlightText(text, searchTerm) {
        if (!searchTerm) return this.truncateFileName(text, 30);
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        const truncated = this.truncateFileName(text, 30);
        return truncated.replace(regex, '<mark style="background-color: #ffd700; color: #000; padding: 2px 5px; border-radius: 3px;">$1</mark>');
    }
    
    filterFiles(type) {
        if (type === 'all') {
            this.loadDocumentsTable();
            return;
        }
        
        const filteredFiles = this.files.filter(file => file.type === type);
        this.displayFilteredFiles(filteredFiles);
    }
    
    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    showForgotModal() {
        const modal = document.getElementById('forgot-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    hideForgotModal() {
        const modal = document.getElementById('forgot-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        document.getElementById('reset-email').value = '';
    }
    
    async sendPasswordReset() {
        const email = document.getElementById('reset-email').value.trim();
        
        if (!email) {
            this.showToast('Please enter your email', 'error');
            return;
        }
        
        try {
            await firebase.auth().sendPasswordResetEmail(email);
            this.showToast('Password reset email sent! Check your inbox.', 'success');
            this.hideForgotModal();
        } catch (error) {
            console.error('Password reset error:', error);
            
            if (error.code === 'auth/user-not-found') {
                this.showToast('No account found with this email', 'error');
            } else if (error.code === 'auth/invalid-email') {
                this.showToast('Invalid email address', 'error');
            } else {
                this.showToast('Error sending reset email: ' + error.message, 'error');
            }
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        alert('Firebase SDK failed to load. Please check your internet connection.');
        return;
    }
    
    // Initialize the app
    setTimeout(() => {
        window.app = new RoyalVaultApp();
        console.log('✅ Royal Vault App initialized');
    }, 1000);
});

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});