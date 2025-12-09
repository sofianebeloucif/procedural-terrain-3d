// Dynamic sky shader

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
    
    // Sky gradient
    float elevation = direction.y;
    vec3 skyColorTop = vec3(0.15, 0.35, 0.75);
    vec3 skyColorHorizon = vec3(0.7, 0.85, 1.0);
    vec3 skyColorBottom = vec3(0.9, 0.95, 1.0);
    
    vec3 skyColor;
    if (elevation > 0.0) {
        skyColor = mix(skyColorHorizon, skyColorTop, elevation);
    } else {
        skyColor = mix(skyColorHorizon, skyColorBottom, -elevation * 0.5);
    }
    
    // Sun
    vec3 sunDir = normalize(uSunPosition);
    float sunDot = max(dot(direction, sunDir), 0.0);
    
    // Sun disc
    vec3 sun = vec3(1.0, 0.95, 0.8) * pow(sunDot, 256.0) * 3.0;
    
    // Sun glow
    float glow = pow(sunDot, 6.0);
    skyColor += vec3(1.0, 0.85, 0.6) * glow * 0.5;
    
    // Add clouds (simple noise)
    float clouds = sin(direction.x * 10.0 + uTime * 0.02) * 
                   cos(direction.z * 10.0 + uTime * 0.03) * 0.5 + 0.5;
    clouds = smoothstep(0.4, 0.6, clouds);
    if (elevation > 0.2) {
        skyColor = mix(skyColor, vec3(1.0), clouds * 0.3);
    }
    
    vec3 finalColor = skyColor + sun;
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;