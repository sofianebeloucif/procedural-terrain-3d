// Terrain Renderer with Photorealistic Biome Shaders

// ============================================
// TERRAIN SHADERS (4 Biomes: Sand, Grass, Rock, Snow)
// ============================================

export const terrainVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying float vHeight;

void main() {
    vNormal = normalize(normalMatrix * normal);
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vPosition = worldPosition.xyz;
    vHeight = position.y;
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const terrainFragmentShader = `
#include <common>

uniform vec3 uSunDirection;
uniform float uTime;

// Texture settings
uniform float uTextureScale;
uniform float uRockSlope;
uniform float uSnowLevel;
uniform float uSandLevel;    
uniform float uGrassStart;   

// Textures
uniform sampler2D uGrassColor;
uniform sampler2D uGrassNormal;
uniform sampler2D uRockColor;
uniform sampler2D uRockNormal;
uniform sampler2D uSandColor;    
uniform sampler2D uSandNormal;   

varying vec3 vNormal;
varying vec3 vPosition;
varying float vHeight;

// Fonction de Tri-Planar Mapping pour les couleurs
vec4 getTriPlanarColor(sampler2D tex, vec3 pos, vec3 normal, float scale) {
    vec3 blending = abs(normal);
    blending = normalize(max(blending, 0.00001));
    float b = (blending.x + blending.y + blending.z);
    blending /= b;
    
    vec4 xaxis = texture2D(tex, pos.yz * scale);
    vec4 yaxis = texture2D(tex, pos.xz * scale);
    vec4 zaxis = texture2D(tex, pos.xy * scale);
    
    return xaxis * blending.x + yaxis * blending.y + zaxis * blending.z;
}

// Fonction de Tri-Planar pour les Normal Maps
vec3 getTriPlanarNormal(sampler2D tex, vec3 pos, vec3 normal, float scale) {
    vec3 blending = abs(normal);
    blending = normalize(max(blending, 0.00001));
    float b = (blending.x + blending.y + blending.z);
    blending /= b;
    
    vec3 xaxis = texture2D(tex, pos.yz * scale).rgb * 2.0 - 1.0;
    vec3 yaxis = texture2D(tex, pos.xz * scale).rgb * 2.0 - 1.0;
    vec3 zaxis = texture2D(tex, pos.xy * scale).rgb * 2.0 - 1.0;
    
    xaxis = vec3(xaxis.xy + normal.zy, abs(xaxis.z) + normal.x);
    yaxis = vec3(yaxis.xy + normal.xz, abs(yaxis.z) + normal.y);
    zaxis = vec3(zaxis.xy + normal.xy, abs(zaxis.z) + normal.z);
    
    return normalize(xaxis * blending.x + yaxis * blending.y + zaxis * blending.z);
}

void main() {
    // 1. Détermination des masques de terrain
    
    float slope = dot(vNormal, vec3(0.0, 1.0, 0.0));
    float rockBlend = 1.0 - smoothstep(uRockSlope - 0.15, uRockSlope + 0.05, slope);
    
    float noise = sin(vPosition.x * 0.1) * cos(vPosition.z * 0.1) * 4.0;
    float snowBlend = smoothstep(uSnowLevel - 5.0 + noise, uSnowLevel + 5.0 + noise, vHeight);
    
    float sandToGrassBlend = smoothstep(uSandLevel, uGrassStart, vHeight);
    sandToGrassBlend = clamp(sandToGrassBlend, 0.0, 1.0);


    // 2. Échantillonnage et Mélange des couches de BASE (Sable et Herbe)
    
    vec3 sandCol = getTriPlanarColor(uSandColor, vPosition, vNormal, uTextureScale).rgb;
    vec3 sandN = getTriPlanarNormal(uSandNormal, vPosition, vNormal, uTextureScale);

    vec3 grassCol = getTriPlanarColor(uGrassColor, vPosition, vNormal, uTextureScale).rgb;
    vec3 grassN = getTriPlanarNormal(uGrassNormal, vPosition, vNormal, uTextureScale);
    
    vec3 baseCol = mix(sandCol, grassCol, sandToGrassBlend);
    vec3 baseN = mix(sandN, grassN, sandToGrassBlend);
    float baseRoughness = mix(0.95, 0.8, sandToGrassBlend); 


    // 3. Application de la Roche (basée sur la PENTE)
    
    vec3 rockCol = getTriPlanarColor(uRockColor, vPosition, vNormal, uTextureScale).rgb;
    vec3 rockN = getTriPlanarNormal(uRockNormal, vPosition, vNormal, uTextureScale);

    vec3 finalAlbedo = mix(baseCol, rockCol, rockBlend);
    vec3 finalNormal = mix(baseN, rockN, rockBlend);
    float roughness = mix(baseRoughness, 0.6, rockBlend); 


    // 4. Application de la Neige (basée sur la HAUTEUR)
    
    vec3 snowCol = vec3(0.95, 0.98, 1.0);
    
    finalAlbedo = mix(finalAlbedo, snowCol, snowBlend);
    finalNormal = mix(finalNormal, vNormal, snowBlend); 
    roughness = mix(roughness, 0.3, snowBlend); 


    // 5. Éclairage
    
    vec3 N = normalize(finalNormal);
    vec3 L = normalize(uSunDirection);
    vec3 V = normalize(cameraPosition - vPosition);
    vec3 H = normalize(L + V);
    
    float NdotL = max(dot(N, L), 0.0);
    vec3 diffuse = finalAlbedo * NdotL;
    
    float NdotH = max(dot(N, H), 0.0);
    float specPower = 32.0 / roughness;
    float specularStrength = (1.0 - roughness) * 0.5;
    vec3 specular = vec3(1.0) * pow(NdotH, specPower) * specularStrength;
    
    vec3 skyColor = vec3(0.6, 0.7, 0.8);
    vec3 groundColor = vec3(0.2, 0.2, 0.15);
    float hemiMix = N.y * 0.5 + 0.5;
    vec3 ambient = mix(groundColor, skyColor, hemiMix) * finalAlbedo * 0.5;
    
    vec3 finalColor = ambient + (diffuse + specular);
    
    // 6. Fog (Brouillard atmosphérique)
    float dist = length(cameraPosition - vPosition);
    float fogFactor = 1.0 - exp(-dist * 0.002);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    vec3 fogColor = vec3(0.53, 0.80, 0.92);
    
    gl_FragColor = vec4(mix(finalColor, fogColor, fogFactor), 1.0);
}
`;

// ============================================
// WATER SHADERS (Vagues et Fresnel)
// ============================================

export const waterVertexShader = `
uniform float uTime;
uniform float uWaveHeight;
uniform float uWaveFrequency;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vElevation;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    
    // Vagues basiques
    float wave1 = sin(modelPosition.x * uWaveFrequency + uTime * 1.0) * cos(modelPosition.z * uWaveFrequency * 0.8 + uTime * 0.8);
    float wave2 = sin(modelPosition.x * uWaveFrequency * 2.0 - uTime * 1.5) * cos(modelPosition.z * uWaveFrequency * 1.5 + uTime * 0.5);
    
    float wave = (wave1 + wave2 * 0.5) * uWaveHeight;
    
    modelPosition.y += wave;
    vElevation = wave; // Élévation des vagues
    
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    
    gl_Position = projectedPosition;
    
    // Normale pour l'éclairage spéculaire
    vNormal = normalize(vec3(
        -cos(modelPosition.x * uWaveFrequency + uTime) * uWaveHeight, 
        1.0, 
        -sin(modelPosition.z * uWaveFrequency + uTime) * uWaveHeight
    ));
    vPosition = modelPosition.xyz;
}
`;

export const waterFragmentShader = `
#include <common>

uniform vec3 uWaterColor;
uniform vec3 uWaterDeepColor;
uniform vec3 uSunDirection;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vElevation;

void main() {
    // 1. Couleur de base (mix en fonction de l'élévation des vagues)
    vec3 color = mix(uWaterDeepColor, uWaterColor, vElevation * 0.5 + 0.5);
    
    // 2. Préparation pour l'éclairage
    vec3 viewDir = normalize(cameraPosition - vPosition);
    vec3 normal = normalize(vNormal);
    
    // 3. Fresnel (Réflexion aux angles rasants)
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
    
    // 4. Specular (Brillance du soleil)
    vec3 lightDir = normalize(uSunDirection);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 128.0);
    
    // Couleur du ciel pour la réflexion
    vec3 skyColor = vec3(0.6, 0.8, 1.0);
    
    // 5. Couleur finale = (Couleur de base ou profondeur) mixée avec la Réflexion (Fresnel) + Spéculaire
    vec3 finalColor = mix(color, skyColor, fresnel * 0.5);
    finalColor += vec3(1.0) * spec; // Ajout de la brillance
    
    // 6. Opacité (plus opaque aux angles rasants)
    float alpha = 0.8 + fresnel * 0.2;
    
    // Note: Pour ajouter l'écume (foam) près du sable, il faudrait ici comparer vPosition.y avec la profondeur réelle
    // du terrain, ce qui requiert de passer la texture de profondeur de la scène, une étape plus complexe.
    
    gl_FragColor = vec4(finalColor, alpha);
}
`;

// ============================================
// SKY SHADERS (Ciel)
// ============================================

export const skyVertexShader = `
varying vec3 vWorldPosition;
varying vec3 vPosition;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vPosition = position;
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const skyFragmentShader = `
uniform vec3 uSunPosition;
uniform float uTime;

varying vec3 vWorldPosition;
varying vec3 vPosition;

void main() {
    vec3 direction = normalize(vPosition);
    vec3 sunDir = normalize(uSunPosition);
    
    float sunDot = max(dot(direction, sunDir), 0.0);
    
    vec3 topColor = vec3(0.1, 0.3, 0.7);
    vec3 bottomColor = vec3(0.6, 0.8, 0.95);
    vec3 skyColor = mix(bottomColor, topColor, max(direction.y, 0.0));
    
    float sun = pow(sunDot, 1000.0);
    float glow = pow(sunDot, 20.0) * 0.5;
    
    vec3 finalColor = skyColor + vec3(1.0, 0.9, 0.7) * (sun + glow);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;