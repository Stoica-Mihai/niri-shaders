float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 open_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
        return vec4(0.0);

    // Horizontal jitter — fast oscillation that decays over time
    float jitter_strength = 0.015 * (1.0 - p) * (1.0 - p);
    float jitter = sin(p * 80.0) * jitter_strength;
    // Per-scanline wobble (rows shift slightly differently)
    float wobble = sin(uv.y * 40.0 + p * 60.0) * 0.005 * (1.0 - p);
    uv.x += jitter + wobble;

    // Barrel distortion (CRT curvature), fades over time
    vec2 centered = uv - 0.5;
    float barrel = 0.12 * (1.0 - p);
    float r2 = dot(centered, centered);
    vec2 warped = uv + centered * r2 * barrel;

    // Circle expansion doesn't start until 40%
    float dist = length(coords_geo.xy - 0.5);
    float expand_p = max(0.0, (p - 0.4) / 0.6);
    float radius = smoothstep(0.0, 0.5, expand_p) * 0.85;
    float circle_mask = smoothstep(radius, radius - 0.04, dist);

    // Bright center dot lingers from 0%–50%
    float dot_glow = 0.0;
    if (p < 0.5) {
        float dp = p / 0.5;
        dot_glow = (1.0 - dp * dp) * exp(-dist * dist * 60.0) * 2.0;
    }

    // Sample window texture
    vec3 coords_tex = niri_geo_to_tex * vec3(warped, 1.0);
    vec4 color = texture2D(niri_tex, coords_tex.st);

    // Image fades in after the dot phase
    float image_vis = smoothstep(0.35, 0.65, p);
    color *= image_vis * circle_mask;

    // Scanlines
    float scanline = 0.5 + 0.5 * sin(uv.y * size_geo.y * 0.8);
    float scan_str = 0.35 * (1.0 - smoothstep(0.5, 1.0, p));
    color.rgb *= 1.0 - scan_str * scanline;

    // Vertical RGB sub-pixel columns
    float vline = 0.5 + 0.5 * sin(uv.x * size_geo.x * 1.5);
    float vline_str = 0.2 * (1.0 - smoothstep(0.6, 1.0, p));
    color.rgb *= 1.0 - vline_str * vline;

    // Static noise
    float noise = hash(uv * size_geo.xy + vec2(p * 1000.0, p * 737.0));
    float noise_str = 0.25 * (1.0 - smoothstep(0.3, 0.8, p));
    color.rgb += vec3(noise * noise_str) * circle_mask;

    // Phosphor tint (slight green)
    float tint = 0.12 * (1.0 - smoothstep(0.5, 1.0, p));
    color.rgb += vec3(-0.02, 0.03, 0.01) * tint;

    // Center dot glow (white-blue)
    color.rgb += vec3(0.7, 0.8, 1.0) * dot_glow;

    return color;
}
