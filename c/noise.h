#ifndef NOISE_H
#define NOISE_H

#include <stdint.h>

// Perlin noise 2D
float perlin2D(float x, float y, uint32_t seed);

// Simplex noise 2D (plus rapide et meilleur)
float simplex2D(float x, float y, uint32_t seed);

// Fractal Brownian Motion (multiples octaves)
float fbm(float x, float y, int octaves, float persistence, float lacunarity, uint32_t seed);

// Utilitaires
float interpolate(float a, float b, float t);
float fade(float t);

#endif // NOISE_H