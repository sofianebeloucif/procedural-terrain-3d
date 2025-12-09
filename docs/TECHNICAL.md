# 📖 Technical Documentation: Procedural Terrain Generator 3D

## 1. Introduction

This document details the technical architecture, data pipeline, and key algorithms used in the 3D procedural terrain generator. The project is based on a hybrid approach: **WebAssembly (WASM)** for intensive computation (mesh generation) and **Three.js** (JavaScript/WebGL) for 3D rendering.

---

## 2. Overall Architecture

The project follows a simple yet optimized architectural model, clearly separating *Computation* from *Rendering*.

| Component | Technology | Primary Role |
| :--- | :--- | :--- |
| **Generation** | C / WebAssembly (`terrain.wasm`) | Calculates the heightmap and builds the complete mesh data (vertices, normals, colors, indices). |
| **Control (Main)** | JavaScript (`main.js`) | Orchestrates the WASM loading, manages UI configuration, and initiates the generation pipeline. |
| **Rendering** | Three.js (`terrainRenderer.js`) | Receives data buffers from WASM and creates the 3D objects (geometry, materials, lighting, scene). |
| **UI** | JavaScript (`ui.js`) | Provides the user interface to adjust noise parameters and trigger regeneration. |

---

## 3. Mesh Generation Pipeline (C/WASM)

Performance is guaranteed by executing the generation logic in C, compiled to WebAssembly via **Emscripten**.

### 3.1. Exported WASM Functions

The following C functions are exposed to JavaScript via `cwrap` for interaction:

| C Function | Description |
| :--- | :--- |
| `generateTerrainWasm` | Main function. Generates the heightmap using FBM and builds the complete indexed mesh (vertices, normals, colors, indices). |
| `getVertices`, `getNormals`, `getColors`, `getIndices` | Utility functions returning pointers to the memory locations of the mesh data buffers. |
| `getVertexCount`, `getIndexCount` | Returns the size of the buffers for copying on the JS side. |
| `freeTerrainWasm` | Frees the memory dynamically allocated on the WASM heap for the generated mesh. |

### 3.2. Data Flow

1.  **JS Side (`main.js`)**: `generate(config)` calls `generateTerrainWasm(config...)`.
2.  **C Side (`terrain.c`)**: The function allocates memory, generates the data, and returns a pointer (`meshPtr`) to a structure containing all data buffers.
3.  **JS Side (`main.js`)**: JS retrieves the pointers and buffer sizes (vertices, indices, etc.) via the `get*` functions.
4.  **Data Transfer**: JS creates `Float32Array` or `Uint32Array` views on the global WASM memory buffer (`this.wasmModule.HEAPF32.buffer`) and uses `.slice()` to copy the data to native JavaScript buffers. **This is the