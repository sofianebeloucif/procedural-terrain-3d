// Main Application Controller
import { TerrainRenderer } from './terrainRenderer.js';
import { CameraController } from './cameraController.js';
import { UIController } from './ui.js';

class TerrainGenerator {
    constructor() {
        this.wasmModule = null;
        this.renderer = null;
        this.cameraController = null;
        this.ui = null;
        this.animationId = null;

        this.init();
    }

    async init() {
        try {
            // Update loading progress
            this.updateLoadingProgress(10, 'Loading WebAssembly module...');

            // Load WASM module
            this.wasmModule = await TerrainModule();
            this.updateLoadingProgress(40, 'WebAssembly loaded successfully!');

            // Initialize renderer
            this.updateLoadingProgress(60, 'Initializing 3D renderer...');
            this.renderer = new TerrainRenderer();

            // Initialize camera controller
            this.updateLoadingProgress(70, 'Setting up camera controls...');
            this.cameraController = new CameraController(
                this.renderer.getCamera(),
                this.renderer.getRenderer().domElement
            );

            // Initialize UI
            this.updateLoadingProgress(80, 'Loading user interface...');
            this.ui = new UIController(this);

            // Generate initial terrain
            this.updateLoadingProgress(90, 'Generating initial terrain...');
            await this.generate({
                seed: 12345,
                resolution: 128, // <-- Cette valeur sera passée comme dimension
                scale: 4,
                height: 30,
                octaves: 6,
                persistence: 0.5,
                lacunarity: 2.0
            });

            // Start render loop
            this.updateLoadingProgress(100, 'Ready!');
            this.animate();

            // Hide loading screen
            setTimeout(() => {
                this.ui.hideLoadingScreen();
            }, 500);

            console.log('Terrain Generator initialized successfully!');

        } catch (error) {
            console.error('Failed to initialize Terrain Generator:', error);
            this.updateLoadingProgress(0, `Error: ${error.message}`);
        }
    }

    async generate(config) {
        if (!this.wasmModule) {
            console.error('WASM module not loaded');
            return;
        }

        try {
            console.log('Generating terrain with config:', config);

            const startTime = performance.now();

            // Call the WASM function
            const generateTerrainWasm = this.wasmModule.cwrap(
                'generateTerrainWasm',
                'number',
                ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number']
            );

            const meshPtr = generateTerrainWasm(
                config.resolution,      // width
                config.resolution,      // height
                config.scale,           // scale
                config.height,          // heightMultiplier
                config.octaves,         // octaves
                config.persistence,     // persistence
                config.lacunarity,      // lacunarity
                config.seed            // seed
            );

            if (!meshPtr) {
                throw new Error('Failed to generate terrain mesh from WASM');
            }

            console.log('WASM returned mesh pointer:', meshPtr);

            // Get data pointers using helper functions
            const getVertices = this.wasmModule.cwrap('getVertices', 'number', ['number']);
            const getNormals = this.wasmModule.cwrap('getNormals', 'number', ['number']);
            const getColors = this.wasmModule.cwrap('getColors', 'number', ['number']);
            const getIndices = this.wasmModule.cwrap('getIndices', 'number', ['number']);
            const getVertexCount = this.wasmModule.cwrap('getVertexCount', 'number', ['number']);
            const getIndexCount = this.wasmModule.cwrap('getIndexCount', 'number', ['number']);

            const verticesPtr = getVertices(meshPtr);
            const normalsPtr = getNormals(meshPtr);
            const colorsPtr = getColors(meshPtr);
            const indicesPtr = getIndices(meshPtr);
            const vertexCount = getVertexCount(meshPtr);
            const indexCount = getIndexCount(meshPtr);

            console.log('Vertex count:', vertexCount, 'Index count:', indexCount);

            if (!verticesPtr || !normalsPtr || !colorsPtr || !indicesPtr) {
                throw new Error('Invalid data pointers from WASM');
            }

            // Copy data from WASM memory to JavaScript
            const vertices = new Float32Array(
                this.wasmModule.HEAPF32.buffer,
                verticesPtr,
                vertexCount * 3
            ).slice();

            const normals = new Float32Array(
                this.wasmModule.HEAPF32.buffer,
                normalsPtr,
                vertexCount * 3
            ).slice();

            const colors = new Float32Array(
                this.wasmModule.HEAPF32.buffer,
                colorsPtr,
                vertexCount * 3
            ).slice();

            const indices = new Uint32Array(
                this.wasmModule.HEAPU32.buffer,
                indicesPtr,
                indexCount
            ).slice();

            console.log('Data copied from WASM memory');

            // --- CHANGEMENT ICI ---
            // Le plan d'eau est maintenant dimensionné en fonction de la résolution du terrain
            await this.renderer.loadTerrain({
                vertices: vertices,
                normals: normals,
                colors: colors,
                indices: indices
            }, config.resolution, config.resolution);
            // ----------------------

            // Free WASM memory
            const freeTerrainWasm = this.wasmModule.cwrap('freeTerrainWasm', null, ['number']);
            freeTerrainWasm(meshPtr);

            const endTime = performance.now();
            console.log(`Terrain generated successfully in ${Math.round(endTime - startTime)}ms`);

            this.ui.showNotification('Terrain generated successfully!', 'success');

        } catch (error) {
            console.error('Error generating terrain:', error);
            this.ui.showNotification(`Failed to generate terrain: ${error.message}`, 'error');
        }
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        this.cameraController.update();
        this.renderer.render();
    }

    updateLoadingProgress(progress, text) {
        const progressBar = document.getElementById('loading-progress');
        const loadingText = document.getElementById('loading-text');

        if (progressBar) progressBar.style.width = `${progress}%`;
        if (loadingText && text) loadingText.textContent = text;
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.cameraController) {
            this.cameraController.dispose();
        }
        if (this.renderer) {
            this.renderer.destroy();
        }
    }
}

// Initialize application when DOM is ready
let terrainGenerator;

window.addEventListener('DOMContentLoaded', () => {
    terrainGenerator = new TerrainGenerator();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (terrainGenerator) {
        terrainGenerator.destroy();
    }
});