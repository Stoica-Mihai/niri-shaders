// --- Hash & 3D Noise primitives ---

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float hash3d(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
}

float noise3d(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash3d(i);
    float n100 = hash3d(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash3d(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash3d(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash3d(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash3d(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash3d(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash3d(i + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);

    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);

    return mix(nxy0, nxy1, f.z);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

// --- Potential field (3D noise scalar field Psi) ---

float potential(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 4; i++) {
        v += a * noise3d(p * freq);
        freq *= 2.2;
        a *= 0.45;
    }
    return v;
}

// --- Curl noise: divergence-free 2D velocity from 3D potential ---

vec2 curlNoise(vec2 pos, float z) {
    float eps = 0.01;
    vec3 p = vec3(pos, z);

    float dPsi_dy = (potential(p + vec3(0.0, eps, 0.0)) - potential(p - vec3(0.0, eps, 0.0))) / (2.0 * eps);
    float dPsi_dx = (potential(p + vec3(eps, 0.0, 0.0)) - potential(p - vec3(eps, 0.0, 0.0))) / (2.0 * eps);

    return vec2(dPsi_dy, -dPsi_dx);
}

// --- Multi-octave curl noise for rich turbulence ---

vec2 multiOctaveCurl(vec2 pos, float z) {
    vec2 vel = vec2(0.0);
    float amp = 1.0;
    float freq = 1.0;
    float totalAmp = 0.0;

    for (int i = 0; i < 4; i++) {
        vel += amp * curlNoise(pos * freq, z + float(i) * 7.31);
        totalAmp += amp;
        amp *= 0.5;
        freq *= 2.0;
    }

    return vel / totalAmp;
}

// --- Vortex enhancement ---

vec2 vortexField(vec2 uv, float p) {
    vec2 vel = vec2(0.0);
    for (int i = 0; i < 4; i++) {
        vec2 center = vec2(
            hash(niri_random_seed + vec2(float(i) * 3.7, 1.2)),
            hash(niri_random_seed + vec2(float(i) * 5.3, 2.8))
        );
        vec2 d = uv - center;
        float r = length(d) + 0.001;
        float strength = 0.08 * p * p * exp(-r * 5.0);
        vel += strength * vec2(-d.y, d.x) / r;
    }
    return vel;
}

// --- Backward advection with midpoint integration ---

vec2 advect(vec2 uv, float p, float dt) {
    float z = p * 3.0 + niri_random_seed * 10.0;

    vec2 v1 = multiOctaveCurl(uv * 3.0 + niri_random_seed, z) + vortexField(uv, p);

    // Buoyancy
    float brightness_est = fbm(uv * 4.0 + niri_random_seed * 2.0);
    v1.y -= 0.05 * brightness_est * p;

    vec2 mid = uv + v1 * dt * 0.5;

    vec2 v2 = multiOctaveCurl(mid * 3.0 + niri_random_seed, z) + vortexField(mid, p);
    v2.y -= 0.05 * brightness_est * p;

    return uv + v2 * dt;
}

// --- Tendril mask ---

float tendrilMask(vec2 uv, float p) {
    float n1 = fbm(uv * 5.0 + niri_random_seed * 3.0);
    float n2 = noise(uv * 12.0 + niri_random_seed * 7.0 + vec2(p * 1.5));
    float n3 = noise(uv * 25.0 + niri_random_seed * 11.0 - vec2(p * 2.0));

    float threshold = n1 * 0.6 + n2 * 0.25 + n3 * 0.15;

    vec2 flow = multiOctaveCurl(uv * 3.0 + niri_random_seed, p * 3.0);
    float flowAlign = fbm((uv + normalize(flow + vec2(0.0001)) * 0.1) * 8.0 + niri_random_seed);
    threshold = mix(threshold, flowAlign, 0.3);

    float edge_width = 0.12 - 0.04 * p;
    float visible = smoothstep(threshold - edge_width, threshold + edge_width, p * 1.15);

    return visible;
}

// --- Color bleeding ---

vec4 colorBleed(vec2 uv, float p, vec2 flow) {
    float bleedRadius = 0.015 * p;
    vec4 sum = vec4(0.0);
    float total = 0.0;

    vec2 flowDir = normalize(flow + vec2(0.0001));
    vec2 perpDir = vec2(-flowDir.y, flowDir.x);

    for (int i = -2; i <= 2; i++) {
        for (int j = -1; j <= 1; j++) {
            vec2 offset = flowDir * float(i) * bleedRadius + perpDir * float(j) * bleedRadius * 0.7;
            vec2 sampleUV = clamp(uv + offset, vec2(0.0), vec2(1.0));
            vec3 sampleTex = niri_geo_to_tex * vec3(sampleUV, 1.0);
            vec4 s = texture2D(niri_tex, sampleTex.st);
            float w = exp(-float(i * i + j * j) * 0.5);
            sum += s * w;
            total += w;
        }
    }

    return sum / total;
}

// --- Diffusion blur ---

vec4 diffusionBlur(vec2 uv, float blurAmount) {
    vec4 sum = vec4(0.0);
    float total = 0.0;
    float radius = blurAmount * 0.012;

    for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * radius;
            vec2 sampleUV = clamp(uv + offset, vec2(0.0), vec2(1.0));
            vec3 sampleTex = niri_geo_to_tex * vec3(sampleUV, 1.0);
            float w = exp(-float(x * x + y * y) * 0.5);
            sum += texture2D(niri_tex, sampleTex.st) * w;
            total += w;
        }
    }

    return sum / total;
}

vec4 open_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
        return vec4(0.0);

    // ip = inverse progress: 1 at start (ink state), 0 at end (clear window)
    float ip = 1.0 - p;

    // --- Advection: ink settles into place as progress increases ---
    float advectStrength = ip * ip * 0.6;
    vec2 advected = advect(uv, ip, -advectStrength);
    advected = clamp(advected, vec2(0.0), vec2(1.0));

    // --- Flow field ---
    float z = ip * 3.0 + niri_random_seed * 10.0;
    vec2 flow = multiOctaveCurl(uv * 3.0 + niri_random_seed, z);

    // --- Tendril reveal mask ---
    // At p=0 (start), mask ~ 0 (nothing visible). At p=1 (end), mask ~ 1 (fully visible).
    float mask = tendrilMask(uv, ip);
    // Invert: we want reveal, not dissolve
    mask = 1.0 - mask;
    // Ensure fully visible at end
    mask = clamp(mask + smoothstep(0.85, 1.0, p) * 2.0, 0.0, 1.0);

    // --- Boundary detection ---
    float boundary = smoothstep(0.3, 0.7, mask) * (1.0 - smoothstep(0.7, 1.0, mask));
    boundary *= ip;

    // --- Sample texture with advected coordinates ---
    vec3 coords_tex = niri_geo_to_tex * vec3(advected, 1.0);
    vec4 color = texture2D(niri_tex, coords_tex.st);

    // --- Color bleeding at reveal boundary ---
    vec4 bled = colorBleed(advected, ip, flow);
    color = mix(color, bled, boundary * 0.6);

    // --- Diffusion ---
    vec4 diffused = diffusionBlur(advected, boundary);
    color = mix(color, diffused, boundary * 0.3);

    // --- Ink tint at tendril edges ---
    vec3 inkColor = vec3(0.08, 0.06, 0.18);
    float inkAmount = boundary * 0.5 + (1.0 - mask) * 0.2 * ip;
    color.rgb = mix(color.rgb, inkColor, inkAmount);

    // --- Desaturation toward boundaries ---
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(color.rgb, vec3(luma) * 0.8, boundary * 0.4);

    // --- Ink wisps at reveal edge ---
    float n = fbm(uv * 5.0 + niri_random_seed * 3.0);
    float edge = abs(ip * 1.15 - n);
    float wisp = exp(-edge * edge * 80.0) * ip;
    vec3 wispColor = vec3(0.12, 0.10, 0.25);
    color.rgb = mix(color.rgb, wispColor, wisp * 0.6);

    // --- Vortex core darkening ---
    vec2 vort = vortexField(uv, ip);
    float vortStrength = length(vort);
    float vortDarken = smoothstep(0.02, 0.12, vortStrength) * ip * 0.15;
    color.rgb *= 1.0 - vortDarken;

    // --- Apply reveal mask ---
    color *= mask;

    // --- Subtle brightness variation ---
    float brightnessShift = fbm(uv * 4.0 + vec2(0.0, ip * 2.0) + niri_random_seed) - 0.5;
    color.rgb += brightnessShift * 0.03 * ip * mask;

    return color;
}
