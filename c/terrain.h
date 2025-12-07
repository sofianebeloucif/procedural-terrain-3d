#ifndef TERRAIN_H
#define TERRAIN_H

#include <stdint.h>

typedef struct {
    float* vertices;    // x, y, z positions
    float* normals;     // nx, ny, nz
    float* colors;      // r, g, b
    uint32_t* indices;  // triangle indices
    int vertexCount;
    int indexCount;
} TerrainMesh;

typedef struct {
    int width;
    int height;
    float scale;
    float heightMultiplier;
    int octaves;
    float persistence;
    float lacunarity;
    uint32_t seed;
    float waterLevel;
} TerrainConfig;

// Generate terrain mesh
TerrainMesh* generateTerrain(TerrainConfig config);

// Free terrain mesh
void freeTerrain(TerrainMesh* mesh);

// Get biome color based on height and moisture
void getBiomeColor(float height, float moisture, float* r, float* g, float* b);

#endif // TERRAIN_H