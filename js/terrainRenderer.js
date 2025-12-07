// Terrain Renderer - Three.js terrain rendering and management

class TerrainRenderer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.terrain = null;
        this.wireframe = false;
        this.container = document.getElementById('canvas-container');

        // Stats
        this.stats = {
            vertices: 0,
            triangles: 0,
            fps: 0,
            genTime: 0
        };

        this.lastTime = performance.now();
        this.frameCount = 0;

        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        this.scene.fog = new THREE.Fog(0x87ceeb, 100, 500);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 50, 100);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true // For screenshots
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        this.setupLights();

        // Grid helper
        const gridHelper = new THREE.GridHelper(200, 50, 0x444444, 0x222222);
        gridHelper.position.y = -0.1;
        this.scene.add(gridHelper);

        // Axes helper
        const axesHelper = new THREE.AxesHelper(50);
        this.scene.add(axesHelper);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        console.log('TerrainRenderer initialized');
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 100, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -200;
        dirLight.shadow.camera.right = 200;
        dirLight.shadow.camera.top = 200;
        dirLight.shadow.camera.bottom = -200;
        this.scene.add(dirLight);

        // Hemisphere light for softer lighting
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x545454, 0.4);
        this.scene.add(hemiLight);
    }

    async loadTerrain(terrainData) {
        const startTime = performance.now();

        // Remove existing terrain
        if (this.terrain) {
            this.scene.remove(this.terrain);
            this.terrain.geometry.dispose();
            this.terrain.material.dispose();
        }

        // Create geometry
        const geometry = new THREE.BufferGeometry();

        // Set attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(terrainData.vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(terrainData.normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(terrainData.colors, 3));
        geometry.setIndex(new THREE.BufferAttribute(terrainData.indices, 1));

        // Create material
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            flatShading: false,
            roughness: 0.8,
            metalness: 0.2
        });

        // Create mesh
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.castShadow = true;
        this.terrain.receiveShadow = true;
        this.scene.add(this.terrain);

        // Update stats
        this.stats.vertices = terrainData.vertices.length / 3;
        this.stats.triangles = terrainData.indices.length / 3;
        this.stats.genTime = Math.round(performance.now() - startTime);

        this.updateStats();

        console.log(`Terrain loaded: ${this.stats.vertices} vertices, ${this.stats.triangles} triangles`);
    }

    toggleWireframe() {
        if (!this.terrain) return;

        this.wireframe = !this.wireframe;
        this.terrain.material.wireframe = this.wireframe;

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
        const colors = geometry.attributes.color.array;

        let obj = '# Procedural Terrain Export\n';
        obj += '# Generated by Terrain Generator 3D\n\n';

        // Vertices
        for (let i = 0; i < positions.length; i += 3) {
            obj += `v ${positions[i]} ${positions[i + 1]} ${positions[i + 2]}\n`;
        }

        obj += '\n';

        // Vertex colors (as comments)
        for (let i = 0; i < colors.length; i += 3) {
            obj += `# vc ${colors[i]} ${colors[i + 1]} ${colors[i + 2]}\n`;
        }

        obj += '\n';

        // Faces (OBJ uses 1-based indexing)
        for (let i = 0; i < indices.length; i += 3) {
            const i1 = indices[i] + 1;
            const i2 = indices[i + 1] + 1;
            const i3 = indices[i + 2] + 1;
            obj += `f ${i1} ${i2} ${i3}\n`;
        }

        // Create download
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
        // Calculate FPS
        this.frameCount++;
        const currentTime = performance.now();
        if (currentTime >= this.lastTime + 1000) {
            this.stats.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            this.frameCount = 0;
            this.lastTime = currentTime;
            this.updateStats();
        }

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

    getCamera() {
        return this.camera;
    }

    getRenderer() {
        return this.renderer;
    }

    destroy() {
        if (this.terrain) {
            this.scene.remove(this.terrain);
            this.terrain.geometry.dispose();
            this.terrain.material.dispose();
        }
        this.renderer.dispose();
        window.removeEventListener('resize', () => this.onWindowResize());
    }
}