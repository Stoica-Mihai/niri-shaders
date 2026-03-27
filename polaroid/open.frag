float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
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

vec4 open_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
        return vec4(0.0);

    vec3 coords_tex = niri_geo_to_tex * vec3(uv, 1.0);
    vec4 color = texture2D(niri_tex, coords_tex.st);

    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Blank polaroid base — greenish cream
    vec3 blank = vec3(0.85, 0.87, 0.80);

    // Dark areas develop first, light areas last
    // Invert luma: dark pixels (low luma) get high priority (low threshold)
    float develop_order = 1.0 - luma;

    // Chemical unevenness — slight spatial variation in development speed
    float chem_noise = noise(uv * 6.0 + niri_random_seed * 5.0) * 0.15;

    // Development threshold — pixels develop when progress passes their threshold
    float threshold = develop_order * 0.7 + chem_noise;
    float developed = smoothstep(threshold - 0.15, threshold + 0.1, p);

    // Phase 1: outlines appear as dark shapes on the blank
    // Dark monochrome silhouette first
    float mono_phase = smoothstep(0.0, 0.5, p);
    vec3 dark_outline = vec3(luma * 0.4 + 0.1);  // dark grey shapes
    vec3 result = mix(blank, dark_outline, developed * (1.0 - mono_phase * 0.5));

    // Phase 2: sepia tones fill in
    float sepia_phase = smoothstep(0.25, 0.65, p);
    vec3 sepia = vec3(
        luma * 0.95 + 0.15,
        luma * 0.8 + 0.1,
        luma * 0.6 + 0.08
    );
    result = mix(result, sepia, developed * sepia_phase);

    // Phase 3: actual color emerges
    float color_phase = smoothstep(0.45, 0.9, p);
    result = mix(result, color.rgb, developed * color_phase);

    // Contrast builds — starts flat
    float contrast = mix(0.5, 1.0, smoothstep(0.2, 0.8, p));
    result = mix(vec3(dot(result, vec3(0.299, 0.587, 0.114)) * 0.8 + 0.1), result, contrast);

    // Warm polaroid cast that fades
    float warmth = (1.0 - p) * 0.05;
    result.r += warmth;
    result.b -= warmth * 0.6;

    // Vignette
    vec2 vig = uv - 0.5;
    float vignette = 1.0 - dot(vig, vig) * 0.25;
    result *= vignette;

    // Subtle grain
    float grain = (hash(uv * size_geo.xy + vec2(p * 100.0)) - 0.5) * 0.025 * (1.0 - p);
    result += vec3(grain);

    color.rgb = result;
    return color;
}
