#include "terrain.h"
#include "noise.h"
#include <stdlib.h>
#include <math.h>
#include <string.h>

void getBiomeColor(float height, float moisture, float* r, float* g, float* b) {
    // Water
    if (height < 0.3f) {
        *r = 0.1f + height * 0.3f;
        *g = 0.3f + height * 0.5f;
        *b = 0.8f;
        return;
    }
    
    // Beach/Sand
    if (height < 0.35f) {
        *r = 0.9f;
        *g = 0.85f;
        *b = 0.6f;
        return;
    }
    
    // Grass/Forest (depends on moisture)
    if (height < 0.65f) {
        if (moisture > 0.5f) {
            // Forest - dark green
            *r = 0.1f + moisture * 0.1f;
            *g = 0.4f + moisture * 0.2f;
            *b = 0.1f;
        } else {
            // Grass - light green
            *r = 0.3f + moisture * 0.2f;
            *g = 0.6f + moisture * 0.2f;
            *b = 0.2f;
        }
        return;
    }
    
    // Mountain (depends on moisture - can be desert or rocky)
    if (height < 0.8f) {
        if (moisture < 0.3f) {
            // Desert/dry
            *r = 0.7f + height * 0.2f;
            *g = 0.6f + height * 0.1f;
            *b = 0.3f;
        } else {
            // Rocky
            *r = 0.5f;
            *g = 0.5f;
            *b = 0.5f;
        }
        return;
    }
    
    // Snow peaks
    float snowBlend = (height - 0.8f) / 0.2f;
    *r = 0.5f + snowBlend * 0.4f;
    *g = 0.5f + snowBlend * 0.4f;
    *b = 0.5f + snowBlend * 0.4f;
}

static void calculateNormals(float* vertices, uint32_t* indices, float* normals, 
                            int vertexCount, int indexCount) {
    // Initialize normals to zero
    memset(normals, 0, vertexCount * 3 * sizeof(float));
    
    // Calculate face normals and accumulate
    for (int i = 0; i < indexCount; i += 3) {
        uint32_t i0 = indices[i];
        uint32_t i1 = indices[i + 1];
        uint32_t i2 = indices[i + 2];
        
        float* v0 = &vertices[i0 * 3];
        float* v1 = &vertices[i1 * 3];
        float* v2 = &vertices[i2 * 3];
        
        // Calculate edge vectors
        float e1x = v1[0] - v0[0];
        float e1y = v1[1] - v0[1];
        float e1z = v1[2] - v0[2];
        
        float e2x = v2[0] - v0[0];
        float e2y = v2[1] - v0[1];
        float e2z = v2[2] - v0[2];
        
        // Calculate normal (cross product)
        float nx = e1y * e2z - e1z * e2y;
        float ny = e1z * e2x - e1x * e2z;
        float nz = e1x * e2y - e1y * e2x;
        
        // Accumulate normals for each vertex
        normals[i0 * 3 + 0] += nx;
        normals[i0 * 3 + 1] += ny;
        normals[i0 * 3 + 2] += nz;
        
        normals[i1 * 3 + 0] += nx;
        normals[i1 * 3 + 1] += ny;
        normals[i1 * 3 + 2] += nz;
        
        normals[i2 * 3 + 0] += nx;
        normals[i2 * 3 + 1] += ny;
        normals[i2 * 3 + 2] += nz;
    }
    
    // Normalize all normals
    for (int i = 0; i < vertexCount; i++) {
        float* n = &normals[i * 3];
        float length = sqrtf(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
        
        if (length > 0.0001f) {
            n[0] /= length;
            n[1] /= length;
            n[2] /= length;
        } else {
            n[0] = 0.0f;
            n[1] = 1.0f;
            n[2] = 0.0f;
        }
    }
}

TerrainMesh* generateTerrain(TerrainConfig config) {
    TerrainMesh* mesh = (TerrainMesh*)malloc(sizeof(TerrainMesh));
    if (!mesh) return NULL;
    
    int width = config.width;
    int height = config.height;
    
    mesh->vertexCount = width * height;
    mesh->indexCount = (width - 1) * (height - 1) * 6;
    
    mesh->vertices = (float*)malloc(mesh->vertexCount * 3 * sizeof(float));
    mesh->normals = (float*)malloc(mesh->vertexCount * 3 * sizeof(float));
    mesh->colors = (float*)malloc(mesh->vertexCount * 3 * sizeof(float));
    mesh->indices = (uint32_t*)malloc(mesh->indexCount * sizeof(uint32_t));
    
    if (!mesh->vertices || !mesh->normals || !mesh->colors || !mesh->indices) {
        freeTerrain(mesh);
        return NULL;
    }
    
    // Generate heightmap
    float** heightmap = (float**)malloc(height * sizeof(float*));
    float** moisturemap = (float**)malloc(height * sizeof(float*));
    
    for (int z = 0; z < height; z++) {
        heightmap[z] = (float*)malloc(width * sizeof(float));
        moisturemap[z] = (float*)malloc(width * sizeof(float));
        
        for (int x = 0; x < width; x++) {
            float nx = (float)x / (float)width;
            float nz = (float)z / (float)height;
            
            // Generate height using FBM
            float h = fbm(nx * config.scale, nz * config.scale, 
                         config.octaves, config.persistence, 
                         config.lacunarity, config.seed);
            
            // Normalize to 0-1
            h = (h + 1.0f) * 0.5f;
            
            // Generate moisture map (different seed)
            float m = fbm(nx * config.scale * 0.5f, nz * config.scale * 0.5f,
                         3, 0.5f, 2.0f, config.seed + 1000);
            m = (m + 1.0f) * 0.5f;
            
            heightmap[z][x] = h;
            moisturemap[z][x] = m;
        }
    }
    
    // Generate vertices
    int vIndex = 0;
    for (int z = 0; z < height; z++) {
        for (int x = 0; x < width; x++) {
            float h = heightmap[z][x];
            float m = moisturemap[z][x];
            
            // Position
            mesh->vertices[vIndex * 3 + 0] = (float)x - (float)width * 0.5f;
            mesh->vertices[vIndex * 3 + 1] = h * config.heightMultiplier;
            mesh->vertices[vIndex * 3 + 2] = (float)z - (float)height * 0.5f;
            
            // Color based on biome
            float r, g, b;
            getBiomeColor(h, m, &r, &g, &b);
            mesh->colors[vIndex * 3 + 0] = r;
            mesh->colors[vIndex * 3 + 1] = g;
            mesh->colors[vIndex * 3 + 2] = b;
            
            vIndex++;
        }
    }
    
    // Generate indices
    int iIndex = 0;
    for (int z = 0; z < height - 1; z++) {
        for (int x = 0; x < width - 1; x++) {
            int topLeft = z * width + x;
            int topRight = topLeft + 1;
            int bottomLeft = (z + 1) * width + x;
            int bottomRight = bottomLeft + 1;
            
            // First triangle
            mesh->indices[iIndex++] = topLeft;
            mesh->indices[iIndex++] = bottomLeft;
            mesh->indices[iIndex++] = topRight;
            
            // Second triangle
            mesh->indices[iIndex++] = topRight;
            mesh->indices[iIndex++] = bottomLeft;
            mesh->indices[iIndex++] = bottomRight;
        }
    }
    
    // Calculate normals
    calculateNormals(mesh->vertices, mesh->indices, mesh->normals, 
                    mesh->vertexCount, mesh->indexCount);
    
    // Free temporary arrays
    for (int z = 0; z < height; z++) {
        free(heightmap[z]);
        free(moisturemap[z]);
    }
    free(heightmap);
    free(moisturemap);
    
    return mesh;
}

void freeTerrain(TerrainMesh* mesh) {
    if (!mesh) return;
    
    free(mesh->vertices);
    free(mesh->normals);
    free(mesh->colors);
    free(mesh->indices);
    free(mesh);
}