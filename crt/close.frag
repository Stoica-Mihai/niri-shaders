float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 close_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
        return vec4(0.0);

    // Horizontal jitter — kicks in as it powers off
    float jitter_strength = 0.015 * p * p;
    float jitter = sin(p * 80.0) * jitter_strength;
    float wobble = sin(uv.y * 40.0 + p * 60.0) * 0.005 * p;
    uv.x += jitter + wobble;

    // Barrel distortion (CRT curvature), grows as it dies
    vec2 centered = uv - 0.5;
    float barrel = 0.12 * p;
    float r2 = dot(centered, centered);
    vec2 warped = uv + centered * r2 * barrel;

    // Circle shrinks aggressively — starts collapsing immediately
    float dist = length(coords_geo.xy - 0.5);
    float radius = (1.0 - smoothstep(0.0, 0.6, p)) * 0.85;
    float circle_mask = smoothstep(radius, radius - 0.03, dist);

    // Vertical squeeze toward horizontal line, then to dot
    float v_squeeze = max(1.0 - p * 1.8, 0.01);
    float h_squeeze = p < 0.5 ? 1.0 : max(1.0 - (p - 0.5) * 2.5, 0.01);
    vec2 squeezed = vec2(
        (warped.x - 0.5) / h_squeeze + 0.5,
        (warped.y - 0.5) / v_squeeze + 0.5
    );

    // Bright center dot appears in last 40%
    float dot_glow = 0.0;
    if (p > 0.6) {
        float dp = (p - 0.6) / 0.4;
        dot_glow = dp * dp * exp(-dist * dist * 60.0) * 2.5;
    }

    // Sample window texture with squeezed coords
    vec3 coords_tex = niri_geo_to_tex * vec3(squeezed, 1.0);
    vec4 color = texture2D(niri_tex, coords_tex.st);

    // Image fades out quickly
    float image_vis = 1.0 - smoothstep(0.1, 0.5, p);
    color *= image_vis * circle_mask;

    // Scanlines — grow stronger as it powers off
    float scanline = 0.5 + 0.5 * sin(uv.y * size_geo.y * 0.8);
    float scan_str = 0.4 * smoothstep(0.0, 0.3, p);
    color.rgb *= 1.0 - scan_str * scanline;

    // Vertical RGB sub-pixel columns
    float vline = 0.5 + 0.5 * sin(uv.x * size_geo.x * 1.5);
    float vline_str = 0.2 * smoothstep(0.0, 0.3, p);
    color.rgb *= 1.0 - vline_str * vline;

    // Static noise — grows stronger
    float noise = hash(uv * size_geo.xy + vec2(p * 1000.0, p * 737.0));
    float noise_str = 0.3 * smoothstep(0.1, 0.5, p);
    color.rgb += vec3(noise * noise_str) * circle_mask;

    // Phosphor tint (slight green) — grows
    float tint = 0.12 * smoothstep(0.0, 0.3, p);
    color.rgb += vec3(-0.02, 0.03, 0.01) * tint;

    // Center dot glow (white-blue)
    color.rgb += vec3(0.7, 0.8, 1.0) * dot_glow;

    return color;
}
