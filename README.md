# 🏔️ Procedural Terrain Generator 3D

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![C](https://img.shields.io/badge/C-00599C?logo=c&logoColor=white)](https://en.wikipedia.org/wiki/C_(programming_language))
[![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?logo=webassembly&logoColor=white)](https://webassembly.org/)
[![Three.js](https://img.shields.io/badge/Three.js-000000?logo=three.js&logoColor=white)](https://threejs.org/)

Real-time 3D procedural terrain generation using C/WebAssembly for high-performance computation and Three.js for rendering.

[🇫🇷 Version française](README.fr.md) | [📺 Live Demo](#) | [📖 Technical Documentation](docs/TECHNICAL.md)

![Terrain Generator Screenshot](assets/screenshots/demo.png)

## ✨ Features

### **Core Capabilities**
- 🚀 **High Performance**: Terrain generation in C compiled to WebAssembly
- 🌄 **Multiple Biomes**: Water, beach, grass, forest, mountains, snow
- 🎨 **Procedural Generation**: Simplex noise with Fractal Brownian Motion
- 🎮 **Interactive 3D**: Real-time orbit camera controls
- ⚙️ **Customizable**: Adjust all terrain parameters in real-time
- 💾 **Export**: Save terrain as OBJ file for 3D printing or modeling

### **Technical Features**
- Simplex noise algorithm (better than Perlin)
- Fractal Brownian Motion (FBM) with configurable octaves
- Automatic normal calculation for realistic lighting
- Biome system based on height and moisture
- Level of Detail (LOD) ready architecture
- Optimized mesh generation

## 🚀 Quick Start

### **Prerequisites**
- **Emscripten** (for building C to WebAssembly)
- A modern web browser with WebAssembly support
- Local web server (Python, Node.js, or similar)

### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/procedural-terrain-3d.git
cd procedural-terrain-3d
```

2. **Install Emscripten**
```bash
# Download and install Emscripten SDK
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
cd ..
```

3. **Build WebAssembly**
```bash
cd c
chmod +x build.sh
./build.sh
cd ..
```

4. **Start local server**
```bash
# Using Python 3
python -m http.server 8000

# Or using Node.js
npx serve

# Or using PHP
php -S localhost:8000
```

5. **Open in browser**
```
http://localhost:8000
```

## 🎮 Usage

### **Basic Controls**
- **Left Mouse + Drag**: Rotate camera around terrain
- **Right Mouse + Drag**: Pan camera
- **Mouse Wheel**: Zoom in/out
- **Space**: Reset camera to default position

### **Terrain Generation**
1. Open the settings panel (⚙️ icon)
2. Adjust parameters:
    - **Seed**: Random seed for reproducible terrain
    - **Resolution**: Grid size (64x64 to 512x512)
    - **Scale**: Zoom level of noise function
    - **Height**: Vertical terrain scale
    - **Octaves**: Level of detail (more = more details)
    - **Persistence**: Amplitude decay between octaves
    - **Lacunarity**: Frequency increase between octaves
3. Click "Generate Terrain"

### **Presets**
Try predefined terrain types:
- 🏔️ **Mountains**: High peaks with valleys
- 🌄 **Hills**: Gentle rolling hills
- 🌾 **Plains**: Mostly flat with small variations
- 🏝️ **Islands**: Archipelago-like terrain
- 🏜️ **Desert**: Sand dunes and plateaus
- 🏞️ **Canyon**: Deep valleys and cliffs

### **Exporting**
- **Screenshot**: 📸 button - Save current view as PNG
- **OBJ Export**: 💾 button - Export 3D model for Blender, Maya, etc.

## 🛠️ Technology Stack

### **Backend (Terrain Generation)**
- **C**: Core terrain generation algorithms
- **WebAssembly**: High-performance execution in browser
- **Emscripten**: C to WebAssembly compiler

### **Frontend (Rendering & UI)**
- **Three.js**: 3D rendering engine
- **WebGL**: GPU-accelerated graphics
- **Vanilla JavaScript**: No framework dependencies
- **CSS3**: Modern styling

### **Algorithms**
- Simplex Noise (Ken Perlin's improved noise)
- Fractal Brownian Motion (FBM)
- Biome generation with moisture mapping
- Smooth normal calculation
- Optimized mesh generation

## 📊 Performance

| Resolution | Vertices | Triangles | Gen Time | FPS |
|------------|----------|-----------|----------|-----|
| 64x64      | 4,096    | 8,192     | ~50ms    | 60  |
| 128x128    | 16,384   | 32,768    | ~200ms   | 60  |
| 256x256    | 65,536   | 131,072   | ~800ms   | 45  |
| 512x512    | 262,144  | 524,288   | ~3s      | 30  |

*Tested on: Intel i7, 16GB RAM, NVIDIA GTX 1060*

## 🎨 Screenshots

| Mountains | Islands | Desert |
|-----------|---------|--------|
| ![Mountains](assets/screenshots/mountains.png) | ![Islands](assets/screenshots/islands.png) | ![Desert](assets/screenshots/desert.png) |

## 📚 Documentation

### **Algorithm Details**

**Simplex Noise**
```
noise(x, y) = contribution from 3 corners of simplex
```

**Fractal Brownian Motion**
```
fbm(x, y) = Σ(amplitude[i] * noise(frequency[i] * x, frequency[i] * y))
where:
  amplitude[i] = persistence^i
  frequency[i] = lacunarity^i
```

**Biome Selection**
```
if (height < 0.3) → Water
else if (height < 0.35) → Beach
else if (height < 0.65) → Grass/Forest (depends on moisture)
else if (height < 0.8) → Mountain/Desert (depends on moisture)
else → Snow
```

See [Technical Documentation](docs/TECHNICAL.md) for more details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Your Name**
- Portfolio: [yourwebsite.com](#)
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your Name](https://linkedin.com/in/yourname)

## 🙏 Acknowledgments

- Ken Perlin for Simplex Noise algorithm
- Three.js community
- Emscripten developers
- Sebastian Lague's procedural terrain tutorials

## 🔮 Future Enhancements

- [ ] Infinite terrain (chunk system)
- [ ] Advanced erosion simulation
- [ ] Vegetation placement
- [ ] Water shader with reflections
- [ ] Multiple LOD levels
- [ ] Texture generation
- [ ] Cave systems
- [ ] Real-time editing tools
- [ ] Multiplayer exploration


---

⭐ If you find this project useful, please consider giving it a star!