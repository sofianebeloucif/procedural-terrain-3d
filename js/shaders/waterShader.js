// Water Shader with waves and reflections

export const waterVertexShader = `uniform float uTime;
uniform float uWaveHeight;
uniform float uWaveFrequency;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vElevation;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    
    // Add waves
    float wave1 = sin(modelPosition.x * uWaveFrequency + uTime * 1.5) * 
                  cos(modelPosition.z * uWaveFrequency * 0.8 + uTime * 1.2);
    
    float wave2 = sin(modelPosition.x * uWaveFrequency * 1.5 - uTime) * 
                  cos(modelPosition.z * uWaveFrequency * 1.2 + uTime * 0.8);
    
    float wave = (wave1 + wave2 * 0.5) * uWaveHeight;
    
    modelPosition.y += wave;
    vElevation = wave;
    
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    
    gl_Position = projectedPosition;
    
    // Calculate normal for waves
    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 bitangent = vec3(0.0, 0.0, 1.0);
    vec3 waveNormal = normalize(cross(tangent, bitangent));
    vNormal = normalize(normalMatrix * waveNormal);
    vPosition = modelPosition.xyz;
}
`;

export const waterFragmentShader = `uniform vec3 uWaterColor;
uniform vec3 uWaterDeepColor;
uniform vec3 uSunDirection;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vElevation;

void main() {
    // Water color based on depth/elevation
    vec3 shallowColor = vec3(0.2, 0.6, 0.8);
    vec3 deepColor = vec3(0.05, 0.2, 0.4);
    vec3 color = mix(deepColor, shallowColor, vElevation * 8.0 + 0.5);
    
    // Fresnel effect for reflections
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - max(dot(viewDirection, vNormal), 0.0), 3.0);
    
    // Sky reflection color
    vec3 skyColor = vec3(0.5, 0.75, 1.0);
    color = mix(color, skyColor, fresnel * 0.6);
    
    // Specular highlight (sun reflection)
    vec3 reflectDirection = reflect(-normalize(uSunDirection), vNormal);
    float specular = pow(max(dot(viewDirection, reflectDirection), 0.0), 64.0);
    
    color += vec3(1.0, 1.0, 0.9) * specular * 1.2;
    
    // Add some foam on wave peaks
    float foam = smoothstep(0.015, 0.035, vElevation);
    color = mix(color, vec3(1.0), foam * 0.4);
    
    // Add caustics effect
    float caustics = sin(vPosition.x * 10.0 + uTime * 2.0) * 
                     cos(vPosition.z * 10.0 + uTime * 1.5) * 0.5 + 0.5;
    caustics = pow(caustics, 3.0) * 0.1;
    color += vec3(caustics);
    
    gl_FragColor = vec4(color, 0.82);
}
`;