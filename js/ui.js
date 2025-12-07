// UI Controller - User interface management

class UIController {
    constructor(terrainGenerator) {
        this.terrainGenerator = terrainGenerator;
        this.controlsPanel = document.getElementById('controls-panel');
        this.infoPanel = document.getElementById('info-panel');

        this.init();
    }

    init() {
        this.setupToolbar();
        this.setupControls();
        this.setupPresets();
        this.setupPanels();
    }

    setupToolbar() {
        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.togglePanel(this.controlsPanel);
            this.infoPanel.classList.add('hidden');
        });

        // Info button
        document.getElementById('info-btn').addEventListener('click', () => {
            this.togglePanel(this.infoPanel);
            this.controlsPanel.classList.add('hidden');
        });

        // Wireframe button
        document.getElementById('wireframe-btn').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const isWireframe = this.terrainGenerator.renderer.toggleWireframe();
            btn.classList.toggle('active', isWireframe);
            this.showNotification(isWireframe ? 'Wireframe enabled' : 'Wireframe disabled');
        });

        // Screenshot button
        document.getElementById('screenshot-btn').addEventListener('click', () => {
            const success = this.terrainGenerator.renderer.takeScreenshot();
            this.showNotification(success ? 'Screenshot saved!' : 'Screenshot failed', success ? 'success' : 'error');
        });

        // Export button
        document.getElementById('export-btn').addEventListener('click', () => {
            const success = this.terrainGenerator.renderer.exportOBJ();
            this.showNotification(success ? 'OBJ file exported!' : 'Export failed', success ? 'success' : 'error');
        });

        // Fullscreen button
        document.getElementById('fullscreen-btn').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
    }

    setupControls() {
        // Seed
        const seedInput = document.getElementById('seed-input');
        seedInput.addEventListener('change', () => {
            document.getElementById('seed-val').textContent = seedInput.value;
        });

        document.getElementById('random-seed').addEventListener('click', () => {
            const randomSeed = Math.floor(Math.random() * 1000000);
            seedInput.value = randomSeed;
            document.getElementById('seed-val').textContent = randomSeed;
        });

        // Resolution
        document.getElementById('resolution').addEventListener('change', (e) => {
            const res = e.target.value;
            document.getElementById('resolution-val').textContent = `${res}x${res}`;
        });

        // Scale
        this.setupSlider('scale', (value) => value.toFixed(1));

        // Height
        this.setupSlider('height', (value) => Math.round(value));

        // Octaves
        this.setupSlider('octaves', (value) => Math.round(value));

        // Persistence
        this.setupSlider('persistence', (value) => value.toFixed(2));

        // Lacunarity
        this.setupSlider('lacunarity', (value) => value.toFixed(1));

        // Generate button
        document.getElementById('generate-btn').addEventListener('click', () => {
            this.generateTerrain();
        });
    }

    setupSlider(id, formatter) {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(`${id}-val`);

        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            valueDisplay.textContent = formatter(value);
        });
    }

    setupPresets() {
        const presets = {
            mountains: {
                scale: 4,
                height: 50,
                octaves: 8,
                persistence: 0.5,
                lacunarity: 2.0
            },
            hills: {
                scale: 6,
                height: 20,
                octaves: 5,
                persistence: 0.5,
                lacunarity: 2.0
            },
            plains: {
                scale: 8,
                height: 10,
                octaves: 3,
                persistence: 0.4,
                lacunarity: 2.0
            },
            islands: {
                scale: 5,
                height: 30,
                octaves: 6,
                persistence: 0.55,
                lacunarity: 2.2
            },
            desert: {
                scale: 7,
                height: 15,
                octaves: 4,
                persistence: 0.4,
                lacunarity: 2.5
            },
            canyon: {
                scale: 3,
                height: 60,
                octaves: 7,
                persistence: 0.6,
                lacunarity: 2.0
            }
        };

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const presetName = btn.dataset.preset;
                const preset = presets[presetName];

                if (preset) {
                    this.applyPreset(preset);
                    this.showNotification(`Applied preset: ${presetName}`);
                }
            });
        });
    }

    applyPreset(preset) {
        // Scale
        document.getElementById('scale').value = preset.scale;
        document.getElementById('scale-val').textContent = preset.scale.toFixed(1);

        // Height
        document.getElementById('height').value = preset.height;
        document.getElementById('height-val').textContent = preset.height;

        // Octaves
        document.getElementById('octaves').value = preset.octaves;
        document.getElementById('octaves-val').textContent = preset.octaves;

        // Persistence
        document.getElementById('persistence').value = preset.persistence;
        document.getElementById('persistence-val').textContent = preset.persistence.toFixed(2);

        // Lacunarity
        document.getElementById('lacunarity').value = preset.lacunarity;
        document.getElementById('lacunarity-val').textContent = preset.lacunarity.toFixed(1);
    }

    setupPanels() {
        // Close buttons
        document.getElementById('close-controls').addEventListener('click', () => {
            this.controlsPanel.classList.add('hidden');
        });

        document.getElementById('close-info').addEventListener('click', () => {
            this.infoPanel.classList.add('hidden');
        });

        // Close on overlay click
        [this.controlsPanel, this.infoPanel].forEach(panel => {
            panel.addEventListener('click', (e) => {
                if (e.target === panel) {
                    panel.classList.add('hidden');
                }
            });
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.controlsPanel.classList.add('hidden');
                this.infoPanel.classList.add('hidden');
            }
        });
    }

    togglePanel(panel) {
        panel.classList.toggle('hidden');
    }

    generateTerrain() {
        const config = {
            seed: parseInt(document.getElementById('seed-input').value),
            resolution: parseInt(document.getElementById('resolution').value),
            scale: parseFloat(document.getElementById('scale').value),
            height: parseFloat(document.getElementById('height').value),
            octaves: parseInt(document.getElementById('octaves').value),
            persistence: parseFloat(document.getElementById('persistence').value),
            lacunarity: parseFloat(document.getElementById('lacunarity').value)
        };

        this.terrainGenerator.generate(config);
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notification-text');

        text.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');

        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }

    updateLoadingProgress(progress, text) {
        const progressBar = document.getElementById('loading-progress');
        const loadingText = document.getElementById('loading-text');

        progressBar.style.width = `${progress}%`;
        if (text) loadingText.textContent = text;
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('fade-out');

        setTimeout(() => {
            loadingScreen.style.display = 'none';
            this.controlsPanel.classList.remove('hidden');
        }, 500);
    }
}