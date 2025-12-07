#include "terrain.h"
#include <emscripten.h>
#include <stdlib.h>

// Structure pour passer les données au JavaScript
typedef struct {
    float* vertices;
    float* normals;
    float* colors;
    unsigned int* indices;
    int vertexCount;
    int indexCount;
} WasmTerrainMesh;

// Fonction exposée à JavaScript
EMSCRIPTEN_KEEPALIVE
WasmTerrainMesh* generateTerrainWasm(
    int width,
    int height,
    float scale,
    float heightMultiplier,
    int octaves,
    float persistence,
    float lacunarity,
    unsigned int seed
) {
    // Créer la config
    TerrainConfig config;
    config.width = width;
    config.height = height;
    config.scale = scale;
    config.heightMultiplier = heightMultiplier;
    config.octaves = octaves;
    config.persistence = persistence;
    config.lacunarity = lacunarity;
    config.seed = seed;
    config.waterLevel = 0.3f;

    // Générer le terrain
    TerrainMesh* mesh = generateTerrain(config);

    if (!mesh) {
        return NULL;
    }

    // Allouer la structure pour WebAssembly
    WasmTerrainMesh* wasmMesh = (WasmTerrainMesh*)malloc(sizeof(WasmTerrainMesh));
    wasmMesh->vertices = mesh->vertices;
    wasmMesh->normals = mesh->normals;
    wasmMesh->colors = mesh->colors;
    wasmMesh->indices = mesh->indices;
    wasmMesh->vertexCount = mesh->vertexCount;
    wasmMesh->indexCount = mesh->indexCount;

    // Libérer la structure terrain (mais pas les données)
    free(mesh);

    return wasmMesh;
}

// Libérer les données
EMSCRIPTEN_KEEPALIVE
void freeTerrainWasm(WasmTerrainMesh* mesh) {
    if (!mesh) return;

    free(mesh->vertices);
    free(mesh->normals);
    free(mesh->colors);
    free(mesh->indices);
    free(mesh);
}

// Getters pour accéder aux données depuis JavaScript
EMSCRIPTEN_KEEPALIVE
float* getVertices(WasmTerrainMesh* mesh) {
    return mesh ? mesh->vertices : NULL;
}

EMSCRIPTEN_KEEPALIVE
float* getNormals(WasmTerrainMesh* mesh) {
    return mesh ? mesh->normals : NULL;
}

EMSCRIPTEN_KEEPALIVE
float* getColors(WasmTerrainMesh* mesh) {
    return mesh ? mesh->colors : NULL;
}

EMSCRIPTEN_KEEPALIVE
unsigned int* getIndices(WasmTerrainMesh* mesh) {
    return mesh ? mesh->indices : NULL;
}

EMSCRIPTEN_KEEPALIVE
int getVertexCount(WasmTerrainMesh* mesh) {
    return mesh ? mesh->vertexCount : 0;
}

EMSCRIPTEN_KEEPALIVE
int getIndexCount(WasmTerrainMesh* mesh) {
    return mesh ? mesh->indexCount : 0;
}