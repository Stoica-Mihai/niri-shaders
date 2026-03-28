// ============================================================
// Dimensional Rift — Close Animation
// p=0: intact window, p=1: fully torn open to the void
// ============================================================

// --- Utility: hash ---
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float hash3(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
}

vec2 hash2(vec2 p) {
    return vec2(
        fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453),
        fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453)
    );
}

// --- Value noise ---
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

// --- 3D value noise for volumetric ---
float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n00 = mix(hash3(i), hash3(i + vec3(1,0,0)), f.x);
    float n01 = mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x);
    float n10 = mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x);
    float n11 = mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x);
    float n0 = mix(n00, n10, f.y);
    float n1 = mix(n01, n11, f.y);
    return mix(n0, n1, f.z);
}

// --- FBM (2D) ---
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

// --- FBM (3D) for volumetric ---
float fbm3(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * noise3(p);
        p = p * 2.03 + vec3(0.31, 0.17, 0.09);
        a *= 0.5;
    }
    return v;
}

// --- Domain-warped fractal tear path (Lichtenberg figure) ---
// Returns signed distance to the fracture: negative = inside tear
float fractureSDF(vec2 uv, float progress) {
    vec2 center = vec2(0.5);
    vec2 d = uv - center;

    // Main fracture spine — vertical with warping
    float warp1 = fbm(uv * 4.0 + vec2(3.7, 1.2) + niri_random_seed) - 0.5;
    float warp2 = fbm(uv * 7.0 + vec2(8.1, 5.4) + niri_random_seed * 1.3) - 0.5;

    // Primary tear line: vertical from center
    float spine_x = center.x + warp1 * 0.25 + warp2 * 0.1;
    float dist_main = abs(uv.x - spine_x);

    // Branch tears — radiate outward from center
    float branch1_angle = 0.7 + warp1 * 0.5;
    vec2 branch1_dir = vec2(cos(branch1_angle), sin(branch1_angle));
    float along1 = dot(d, branch1_dir);
    float perp1 = abs(dot(d, vec2(-branch1_dir.y, branch1_dir.x)));
    float branch1_warp = fbm(uv * 6.0 + vec2(2.1, 9.3) + niri_random_seed * 2.0) * 0.08;
    float dist_branch1 = perp1 + branch1_warp;
    float branch1_mask = smoothstep(0.0, 0.35, along1) * smoothstep(0.5, 0.0, along1);
    dist_branch1 = mix(999.0, dist_branch1, branch1_mask);

    float branch2_angle = 2.4 + warp2 * 0.5;
    vec2 branch2_dir = vec2(cos(branch2_angle), sin(branch2_angle));
    float along2 = dot(d, branch2_dir);
    float perp2 = abs(dot(d, vec2(-branch2_dir.y, branch2_dir.x)));
    float branch2_warp = fbm(uv * 5.0 + vec2(6.7, 3.1) + niri_random_seed * 3.0) * 0.08;
    float dist_branch2 = perp2 + branch2_warp;
    float branch2_mask = smoothstep(0.0, 0.3, along2) * smoothstep(0.45, 0.0, along2);
    dist_branch2 = mix(999.0, dist_branch2, branch2_mask);

    float branch3_angle = 4.0 + warp1 * 0.3;
    vec2 branch3_dir = vec2(cos(branch3_angle), sin(branch3_angle));
    float along3 = dot(d, branch3_dir);
    float perp3 = abs(dot(d, vec2(-branch3_dir.y, branch3_dir.x)));
    float branch3_warp = fbm(uv * 5.5 + vec2(1.3, 7.7) + niri_random_seed * 4.0) * 0.07;
    float dist_branch3 = perp3 + branch3_warp;
    float branch3_mask = smoothstep(0.0, 0.25, along3) * smoothstep(0.4, 0.0, along3);
    dist_branch3 = mix(999.0, dist_branch3, branch3_mask);

    // Combine all branches — minimum distance
    float dist = min(dist_main, min(dist_branch1, min(dist_branch2, dist_branch3)));

    // Tear width grows with progress
    float tear_width = 0.005 + 0.18 * progress * progress;

    // Restrict extent: tear grows outward from center
    float extent = progress * 0.75;
    float dist_from_center = length(d);
    float extent_mask = smoothstep(extent, extent * 0.5, dist_from_center);

    return dist - tear_width * extent_mask;
}

// --- Capsule SDF for lightning bolt segments ---
float capsuleSDF(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

// --- Procedural lightning along tear edges ---
float lightning(vec2 uv, float progress, float time_seed) {
    float glow = 0.0;
    vec2 center = vec2(0.5);

    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float angle = fi * 1.047 + time_seed * 3.0;
        float len = 0.1 + 0.25 * progress;

        vec2 start = center + vec2(
            cos(angle) * 0.02,
            sin(angle) * 0.02
        );

        // Multi-segment bolt
        vec2 prev = start;
        for (int j = 0; j < 4; j++) {
            float fj = float(j);
            float seg_frac = (fj + 1.0) / 4.0;
            vec2 jitter = vec2(
                hash(vec2(fi * 7.1 + fj * 3.3, time_seed * 20.0 + fi)) - 0.5,
                hash(vec2(fi * 5.7 + fj * 2.1, time_seed * 20.0 + fj)) - 0.5
            ) * 0.08 * progress;

            vec2 next = center + vec2(cos(angle), sin(angle)) * len * seg_frac + jitter;
            float thickness = 0.002 * (1.0 - seg_frac * 0.5);
            float d = capsuleSDF(uv, prev, next, thickness);
            float flicker = 0.5 + 0.5 * sin(time_seed * 40.0 + fi * 13.0 + fj * 7.0);
            glow += exp(-d * d * 8000.0) * flicker * progress;
            prev = next;
        }
    }
    return glow;
}

// --- Volumetric raymarching into the void ---
vec3 raymarchVoid(vec2 uv, float progress) {
    vec3 col = vec3(0.0);
    float total_density = 0.0;

    // Ray origin and direction
    vec3 ro = vec3(uv - 0.5, 0.0);
    vec3 rd = normalize(vec3(0.0, 0.0, -1.0) + vec3((uv - 0.5) * 0.3, 0.0));

    float t = 0.0;
    float step_size = 0.08;

    for (int i = 0; i < 20; i++) {
        vec3 pos = ro + rd * t;

        // Animated 3D noise density
        float density = fbm3(pos * 3.0 + vec3(0.0, 0.0, progress * 2.0));
        density = max(0.0, density - 0.35) * 2.5;

        // Color: deep purples and dark blues
        vec3 void_color = mix(
            vec3(0.05, 0.02, 0.12),
            vec3(0.1, 0.05, 0.25),
            density
        );

        // Occasional bright specks (particle debris)
        float speck = hash3(floor(pos * 12.0 + vec3(progress * 3.0)));
        if (speck > 0.97) {
            float speck_bright = (speck - 0.97) * 33.33;
            float speck_flicker = 0.5 + 0.5 * sin(progress * 15.0 + speck * 100.0);
            void_color += vec3(0.6, 0.8, 1.0) * speck_bright * speck_flicker * 2.0;
        }

        // Accumulate
        float alpha = density * step_size * 1.5;
        col += void_color * alpha * (1.0 - total_density);
        total_density += alpha * (1.0 - total_density);

        if (total_density > 0.95) break;
        t += step_size;
    }

    // Background void color
    vec3 bg = mix(vec3(0.02, 0.01, 0.06), vec3(0.06, 0.02, 0.15), length(uv - 0.5));
    col = mix(bg, col, min(total_density, 1.0));

    return col;
}

// ============================================================
// Main close shader
// ============================================================
vec4 close_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
        return vec4(0.0);

    // Fracture SDF
    float sdf = fractureSDF(uv, p);

    // Time seed for animation
    float time_seed = p + hash(vec2(niri_random_seed, niri_random_seed * 1.7)) * 100.0;

    // --- Region classification ---
    // Negative SDF = inside the tear (void visible)
    // Positive SDF = window surface (potentially curled)

    float tear_edge = 0.03;
    float curl_zone = 0.08;

    // === VOID REGION (inside tear) ===
    if (sdf < 0.0) {
        // Raymarch the volumetric void
        vec3 void_col = raymarchVoid(uv, p);

        // Lightning along tear edges (visible in void)
        float bolt = lightning(uv, p, time_seed);
        void_col += vec3(0.5, 0.8, 1.0) * bolt * 0.8;

        // Edge glow — bright cyan/white glow bleeding inward
        float edge_glow = exp(sdf * 15.0) * p;
        void_col += vec3(0.3, 0.8, 1.0) * edge_glow * 1.5;

        // Particle debris
        float debris = hash(uv * size_geo.xy * 3.0 + vec2(time_seed * 10.0));
        float debris_mask = smoothstep(-0.15, -0.01, sdf) * p;
        if (debris > 0.985) {
            float brightness = (debris - 0.985) * 66.67;
            void_col += vec3(0.7, 0.9, 1.0) * brightness * debris_mask;
        }

        float void_alpha = smoothstep(0.0, -0.01, sdf);
        return vec4(void_col * void_alpha, void_alpha);
    }

    // === WINDOW REGION (outside tear) ===

    // Cloth curl-back: near the tear edge, warp UVs as if fabric curls backward
    vec2 sample_uv = uv;
    float curl_factor = 0.0;
    float backside = 0.0;

    if (sdf < curl_zone) {
        float curl_t = 1.0 - sdf / curl_zone;
        curl_t = curl_t * curl_t * p;

        // Gradient direction: away from tear
        vec2 grad;
        float eps = 0.005;
        grad.x = fractureSDF(uv + vec2(eps, 0.0), p) - fractureSDF(uv - vec2(eps, 0.0), p);
        grad.y = fractureSDF(uv + vec2(0.0, eps), p) - fractureSDF(uv - vec2(0.0, eps), p);
        grad = normalize(grad + vec2(0.0001));

        // Curl displacement — paper bending backward
        float curl_amount = curl_t * 0.06;
        sample_uv = uv + grad * curl_amount;

        // The curl creates a foreshortening effect
        float curl_angle = curl_t * 1.8;
        curl_factor = curl_t;

        // If curled enough, show the back side (darkened)
        backside = smoothstep(0.4, 0.8, curl_t);
    }

    // Clamp to valid range
    sample_uv = clamp(sample_uv, vec2(0.0), vec2(1.0));

    // --- Chromatic aberration near tear ---
    float chroma_strength = exp(-sdf * 20.0) * p * 0.012;
    vec2 chroma_dir = normalize(uv - vec2(0.5));

    vec3 tex_r = niri_geo_to_tex * vec3(sample_uv + chroma_dir * chroma_strength, 1.0);
    vec3 tex_g = niri_geo_to_tex * vec3(sample_uv, 1.0);
    vec3 tex_b = niri_geo_to_tex * vec3(sample_uv - chroma_dir * chroma_strength, 1.0);

    vec4 color;
    color.r = texture2D(niri_tex, tex_r.st).r;
    color.g = texture2D(niri_tex, tex_g.st).g;
    color.b = texture2D(niri_tex, tex_b.st).b;
    color.a = texture2D(niri_tex, tex_g.st).a;

    // Darken the back side of curled fabric
    color.rgb *= mix(1.0, 0.25, backside);

    // Slight purple tint on curl back
    color.rgb = mix(color.rgb, color.rgb * vec3(0.7, 0.5, 0.9), backside * 0.5);

    // --- Edge glow (outward) ---
    float glow_out = exp(-sdf * 25.0) * p;
    color.rgb += vec3(0.2, 0.7, 1.0) * glow_out * 0.6;

    // White-hot edge
    float white_edge = exp(-sdf * 80.0) * p;
    color.rgb += vec3(1.0, 1.0, 1.0) * white_edge * 0.4;

    // --- Lightning visible on the surface near tear ---
    float bolt = lightning(uv, p, time_seed);
    float bolt_mask = exp(-sdf * 10.0);
    color.rgb += vec3(0.4, 0.7, 1.0) * bolt * bolt_mask * 0.5;

    // --- Progressive fade of remaining window as tear consumes it ---
    float coverage = smoothstep(0.6, 1.0, p);
    color *= 1.0 - coverage;

    return color;
}
