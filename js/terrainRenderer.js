// Terrain Renderer - Three.js terrain rendering and management
import { terrainVertexShader, terrainFragmentShader, waterVertexShader, waterFragmentShader, skyVertexShader, skyFragmentShader } from './shaders/terrainShader.js';

// ============================================
// TERRAIN RENDERER CLASS
// ============================================

export class TerrainRenderer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.terrain = null;
        this.water = null;
        this.sky = null;
        this.wireframe = false;
        this.container = document.getElementById('canvas-container');

        // Textures storage (6 textures pour 4 biomes)
        this.textures = {
            grassColor: null,
            grassNormal: null,
            rockColor: null,
            rockNormal: null,
            sandColor: null,
            sandNormal: null
        };

        // Shader uniforms
        this.terrainUniforms = null;
        this.waterUniforms = null;
        this.skyUniforms = null;

        // Stats
        this.stats = {
            vertices: 0,
            triangles: 0,
            fps: 0,
            genTime: 0
        };

        this.lastTime = performance.now();
        this.frameCount = 0;
        this.clock = new THREE.Clock();

        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x9bb5ce, 150, 600);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 60, 120);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        this.setupLights();

        // Sky dome
        this.createSky();

        // Start loading textures
        this.loadTextures();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        console.log('TerrainRenderer initialized with 4-biome logic.');
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
        dirLight.position.set(100, 100, 50);
        dirLight.castShadow = true;

        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -300;
        dirLight.shadow.camera.right = 300;
        dirLight.shadow.camera.top = 300;
        dirLight.shadow.camera.bottom = -300;
        dirLight.shadow.bias = -0.0001;
        this.scene.add(dirLight);

        // Store sun direction for shaders
        this.sunDirection = dirLight.position.clone().normalize();

        // Hemisphere light
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x6b8e9f, 0.4);
        this.scene.add(hemiLight);
    }

    createFallbackTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#888888';
        ctx.fillRect(0,0,64,64);
        for(let i=0; i<100; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#999999' : '#777777';
            ctx.fillRect(Math.random()*64, Math.random()*64, 2, 2);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    async loadTextures() {
        const loader = new THREE.TextureLoader();

        const loadTexture = (path) => {
            return new Promise((resolve) => {
                loader.load(path,
                    (tex) => {
                        tex.wrapS = THREE.RepeatWrapping;
                        tex.wrapT = THREE.RepeatWrapping;
                        resolve(tex);
                    },
                    undefined,
                    (err) => {
                        console.warn(`Texture ${path} missing. Using fallback.`);
                        resolve(this.createFallbackTexture());
                    }
                );
            });
        };

        try {
            this.textures.grassColor = await loadTexture('./assets/grass_color.jpg');
            this.textures.grassNormal = await loadTexture('./assets/grass_normal.jpg');
            this.textures.rockColor = await loadTexture('./assets/rock_color.jpg');
            this.textures.rockNormal = await loadTexture('./assets/rock_normal.jpg');

            this.textures.sandColor = await loadTexture('./assets/sand_color.jpg');
            this.textures.sandNormal = await loadTexture('./assets/sand_normal.jpg');

            console.log('Textures loaded successfully');

            if (this.terrainUniforms) {
                this.terrainUniforms.uGrassColor.value = this.textures.grassColor;
                this.terrainUniforms.uGrassNormal.value = this.textures.grassNormal;
                this.terrainUniforms.uRockColor.value = this.textures.rockColor;
                this.terrainUniforms.uRockNormal.value = this.textures.rockNormal;
                this.terrainUniforms.uSandColor.value = this.textures.sandColor;
                this.terrainUniforms.uSandNormal.value = this.textures.sandNormal;
            }
        } catch (e) {
            console.error('Error loading textures:', e);
        }
    }

    createSky() {
        const skyGeometry = new THREE.SphereGeometry(1800, 32, 32);

        this.skyUniforms = {
            uSunPosition: { value: new THREE.Vector3(100, 100, 50) },
            uTime: { value: 0 }
        };

        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: this.skyUniforms,
            vertexShader: skyVertexShader,
            fragmentShader: skyFragmentShader,
            side: THREE.BackSide
        });

        this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.sky);
    }

    createWater(terrainSizeX = 200, terrainSizeZ = 200) {

        // Utilise les dimensions du terrain (avec une petite marge si nécessaire)
        const waterWidth = terrainSizeX;
        const waterDepth = terrainSizeZ;
        const waterSegments = 100;

        const waterGeometry = new THREE.PlaneGeometry(
            waterWidth,
            waterDepth,
            waterSegments,
            waterSegments
        );
        waterGeometry.rotateX(-Math.PI / 2);

        this.waterUniforms = {
            uTime: { value: 0 },
            uWaveHeight: { value: 0.3 },
            uWaveFrequency: { value: 0.8 },
            uWaterColor: { value: new THREE.Color(0x3498db) },
            uWaterDeepColor: { value: new THREE.Color(0x1a5490) },
            uSunDirection: { value: this.sunDirection }
            // Note: cameraPosition est passé par Three.js via #include <common>
        };

        const waterMaterial = new THREE.ShaderMaterial({
            uniforms: this.waterUniforms,
            vertexShader: waterVertexShader,
            fragmentShader: waterFragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.position.y = 3;
        this.water.receiveShadow = true;
        this.scene.add(this.water);
    }

    // MODIFICATION ICI: Ajout de sizeX et sizeZ pour récupérer les dimensions du terrain
    async loadTerrain(terrainData, sizeX = 200, sizeZ = 200) {
        const startTime = performance.now();

        console.log('Loading terrain with', terrainData.vertices.length / 3, 'vertices');

        if (this.terrain) {
            this.scene.remove(this.terrain);
            this.terrain.geometry.dispose();
            this.terrain.material.dispose();
        }
        if (this.water) {
            this.scene.remove(this.water);
            this.water.geometry.dispose();
            this.water.material.dispose();
        }

        // Create geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(terrainData.vertices, 3));
        geometry.setAttribute('normal',   new THREE.BufferAttribute(terrainData.normals, 3));
        geometry.setIndex(new THREE.BufferAttribute(terrainData.indices, 1));

        // Create shader material with TEXTURES
        this.terrainUniforms = {
            uSunDirection: { value: this.sunDirection },
            uTime: { value: 0 },

            // Texture Uniforms
            uGrassColor: { value: this.textures.grassColor || this.createFallbackTexture() },
            uGrassNormal: { value: this.textures.grassNormal || this.createFallbackTexture() },
            uRockColor: { value: this.textures.rockColor || this.createFallbackTexture() },
            uRockNormal: { value: this.textures.rockNormal || this.createFallbackTexture() },
            uSandColor: { value: this.textures.sandColor || this.createFallbackTexture() },
            uSandNormal: { value: this.textures.sandNormal || this.createFallbackTexture() },

            // Biome Settings
            uTextureScale: { value: 0.08 },
            uRockSlope: { value: 0.75 },
            uSnowLevel: { value: 45.0 },
            uSandLevel: { value: 5.0 },
            uGrassStart: { value: 10.0 }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.terrainUniforms,
            vertexShader: terrainVertexShader,
            fragmentShader: terrainFragmentShader,
            side: THREE.FrontSide,
            vertexColors: false
        });

        // Create mesh
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.castShadow = true;
        this.terrain.receiveShadow = true;
        this.scene.add(this.terrain);

        // Appel de createWater avec les dimensions du terrain
        this.createWater(sizeX, sizeZ);

        // Update stats
        this.stats.vertices = terrainData.vertices.length / 3;
        this.stats.triangles = terrainData.indices.length / 3;
        this.stats.genTime = Math.round(performance.now() - startTime);

        this.updateStats();

        console.log(`Terrain loaded: ${this.stats.vertices} vertices`);
    }

    toggleWireframe() {
        if (!this.terrain) return false;

        this.wireframe = !this.wireframe;

        if (this.wireframe) {
            const wireframeMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                wireframe: true
            });
            this.terrain.material = wireframeMaterial;
        } else {
            const material = new THREE.ShaderMaterial({
                uniforms: this.terrainUniforms,
                vertexShader: terrainVertexShader,
                fragmentShader: terrainFragmentShader,
                side: THREE.FrontSide,
                vertexColors: false
            });
            this.terrain.material = material;
            this.terrain.material.needsUpdate = true;
        }

        return this.wireframe;
    }

    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        const canvas = this.renderer.domElement;
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.download = `terrain-${timestamp}.png`;
        link.href = dataURL;
        link.click();
        return true;
    }

    exportOBJ() {
        if (!this.terrain) return null;
        const geometry = this.terrain.geometry;
        const positions = geometry.attributes.position.array;
        const indices = geometry.index.array;

        let obj = '# Procedural Terrain Export\n';
        for (let i = 0; i < positions.length; i += 3) {
            obj += `v ${positions[i]} ${positions[i + 1]} ${positions[i + 2]}\n`;
        }
        obj += '\n';
        for (let i = 0; i < indices.length; i += 3) {
            const i1 = indices[i] + 1;
            const i2 = indices[i + 1] + 1;
            const i3 = indices[i + 2] + 1;
            obj += `f ${i1} ${i2} ${i3}\n`;
        }

        const blob = new Blob([obj], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.download = `terrain-${timestamp}.obj`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        return true;
    }

    render() {
        this.frameCount++;
        const currentTime = performance.now();
        if (currentTime >= this.lastTime + 1000) {
            this.stats.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            this.frameCount = 0;
            this.lastTime = currentTime;
            this.updateStats();
        }

        const elapsedTime = this.clock.getElapsedTime();

        if (this.terrainUniforms) this.terrainUniforms.uTime.value = elapsedTime;
        if (this.waterUniforms) this.waterUniforms.uTime.value = elapsedTime;
        if (this.skyUniforms) this.skyUniforms.uTime.value = elapsedTime;

        this.renderer.render(this.scene, this.camera);
    }

    updateStats() {
        document.getElementById('vertices-count').textContent = this.stats.vertices.toLocaleString();
        document.getElementById('triangles-count').textContent = this.stats.triangles.toLocaleString();
        document.getElementById('fps-count').textContent = this.stats.fps;
        document.getElementById('gen-time').textContent = this.stats.genTime + 'ms';
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    getCamera() { return this.camera; }
    getRenderer() { return this.renderer; }

    destroy() {
        if (this.terrain) {
            this.scene.remove(this.terrain);
            this.terrain.geometry.dispose();
            this.terrain.material.dispose();
        }
        if (this.water) {
            this.scene.remove(this.water);
            this.water.geometry.dispose();
            this.water.material.dispose();
        }
        if (this.sky) {
            this.scene.remove(this.sky);
            this.sky.geometry.dispose();
            this.sky.material.dispose();
        }
        this.renderer.dispose();
        window.removeEventListener('resize', () => this.onWindowResize());
    }
}
window.TerrainRenderer = TerrainRenderer;