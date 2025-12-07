#include "noise.h"
#include <math.h>
#include <stdlib.h>

// Permutation table pour Perlin noise
static int p[512];
static int initialized = 0;

// Gradient vectors for 2D
static const float gradients2D[8][2] = {
    {1, 1}, {-1, 1}, {1, -1}, {-1, -1},
    {1, 0}, {-1, 0}, {0, 1}, {0, -1}
};

// Initialize permutation table
static void initPermutation(uint32_t seed) {
    if (initialized) return;
    
    srand(seed);
    
    // Fill with sequential values
    for (int i = 0; i < 256; i++) {
        p[i] = i;
    }
    
    // Shuffle
    for (int i = 255; i > 0; i--) {
        int j = rand() % (i + 1);
        int temp = p[i];
        p[i] = p[j];
        p[j] = temp;
    }
    
    // Duplicate for wrapping
    for (int i = 0; i < 256; i++) {
        p[256 + i] = p[i];
    }
    
    initialized = 1;
}

float fade(float t) {
    return t * t * t * (t * (t * 6.0f - 15.0f) + 10.0f);
}

float interpolate(float a, float b, float t) {
    return a + t * (b - a);
}

static float dotGridGradient(int ix, int iy, float x, float y) {
    int hash = p[p[ix & 255] + (iy & 255)] & 7;
    float dx = x - (float)ix;
    float dy = y - (float)iy;
    return gradients2D[hash][0] * dx + gradients2D[hash][1] * dy;
}

float perlin2D(float x, float y, uint32_t seed) {
    initPermutation(seed);
    
    int x0 = (int)floor(x);
    int x1 = x0 + 1;
    int y0 = (int)floor(y);
    int y1 = y0 + 1;
    
    float sx = fade(x - (float)x0);
    float sy = fade(y - (float)y0);
    
    float n0 = dotGridGradient(x0, y0, x, y);
    float n1 = dotGridGradient(x1, y0, x, y);
    float ix0 = interpolate(n0, n1, sx);
    
    n0 = dotGridGradient(x0, y1, x, y);
    n1 = dotGridGradient(x1, y1, x, y);
    float ix1 = interpolate(n0, n1, sx);
    
    return interpolate(ix0, ix1, sy);
}

// Simplex noise 2D (Ken Perlin's improved noise)
float simplex2D(float x, float y, uint32_t seed) {
    initPermutation(seed);
    
    const float F2 = 0.366025403f; // (sqrt(3) - 1) / 2
    const float G2 = 0.211324865f; // (3 - sqrt(3)) / 6
    
    float s = (x + y) * F2;
    int i = (int)floor(x + s);
    int j = (int)floor(y + s);
    
    float t = (float)(i + j) * G2;
    float X0 = (float)i - t;
    float Y0 = (float)j - t;
    float x0 = x - X0;
    float y0 = y - Y0;
    
    int i1, j1;
    if (x0 > y0) {
        i1 = 1; j1 = 0;
    } else {
        i1 = 0; j1 = 1;
    }
    
    float x1 = x0 - (float)i1 + G2;
    float y1 = y0 - (float)j1 + G2;
    float x2 = x0 - 1.0f + 2.0f * G2;
    float y2 = y0 - 1.0f + 2.0f * G2;
    
    int ii = i & 255;
    int jj = j & 255;
    
    float n0, n1, n2;
    
    float t0 = 0.5f - x0 * x0 - y0 * y0;
    if (t0 < 0.0f) {
        n0 = 0.0f;
    } else {
        t0 *= t0;
        int gi0 = p[ii + p[jj]] & 7;
        n0 = t0 * t0 * (gradients2D[gi0][0] * x0 + gradients2D[gi0][1] * y0);
    }
    
    float t1 = 0.5f - x1 * x1 - y1 * y1;
    if (t1 < 0.0f) {
        n1 = 0.0f;
    } else {
        t1 *= t1;
        int gi1 = p[ii + i1 + p[jj + j1]] & 7;
        n1 = t1 * t1 * (gradients2D[gi1][0] * x1 + gradients2D[gi1][1] * y1);
    }
    
    float t2 = 0.5f - x2 * x2 - y2 * y2;
    if (t2 < 0.0f) {
        n2 = 0.0f;
    } else {
        t2 *= t2;
        int gi2 = p[ii + 1 + p[jj + 1]] & 7;
        n2 = t2 * t2 * (gradients2D[gi2][0] * x2 + gradients2D[gi2][1] * y2);
    }
    
    return 70.0f * (n0 + n1 + n2);
}

float fbm(float x, float y, int octaves, float persistence, float lacunarity, uint32_t seed) {
    float total = 0.0f;
    float frequency = 1.0f;
    float amplitude = 1.0f;
    float maxValue = 0.0f;
    
    for (int i = 0; i < octaves; i++) {
        total += simplex2D(x * frequency, y * frequency, seed + i) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    
    return total / maxValue;
}