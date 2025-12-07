#!/bin/bash

# Build script for WebAssembly terrain generator

echo "Building Terrain Generator to WebAssembly..."

# Check if Emscripten is installed
if ! command -v emcc &> /dev/null
then
    echo "Error: Emscripten not found!"
    echo "Please install Emscripten: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

# Create output directory
mkdir -p ../wasm

# Compile to WebAssembly
emcc noise.c terrain.c wasm_interface.c \
    -o ../wasm/terrain.js \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_malloc","_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","setValue","HEAPF32","HEAPU32"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='TerrainModule' \
    -s ENVIRONMENT='web' \
    -O3

echo "Build complete! Output: ../wasm/terrain.js and ../wasm/terrain.wasm"
echo ""
echo "To use in browser:"
echo "1. Start a local server (python -m http.server 8000)"
echo "2. Open http://localhost:8000 in your browser"