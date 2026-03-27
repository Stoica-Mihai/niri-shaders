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

vec4 close_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
        return vec4(0.0);

    // Smoke displacement — pixels drift upward with turbulence
    float turb = fbm(uv * 5.0 + vec2(p * 2.0, -p * 3.0)) - 0.5;
    float turb2 = fbm(uv * 3.0 + vec2(-p * 1.5, -p * 2.0) + niri_random_seed) - 0.5;
    float drift_x = turb * 0.15 * p * p;
    float drift_y = -p * p * 0.2 + turb2 * 0.12 * p;

    vec2 displaced = uv + vec2(drift_x, drift_y);
    displaced = clamp(displaced, vec2(0.0), vec2(1.0));

    // Sample texture
    vec3 coords_tex = niri_geo_to_tex * vec3(displaced, 1.0);
    vec4 color = texture2D(niri_tex, coords_tex.st);

    // Noise-based dissolve — each pixel vanishes at its own threshold
    float n = fbm(uv * 6.0 + niri_random_seed * 3.0);
    float visible = 1.0 - smoothstep(n - 0.1, n + 0.1, p * 1.2);

    // Smoke wisps at the dissolve boundary
    float edge = abs(p * 1.2 - n);
    float wisp = exp(-edge * edge * 100.0) * p;
    vec3 smoke_color = vec3(0.55, 0.55, 0.6);
    color.rgb = mix(color.rgb, smoke_color, wisp * 0.7);

    // Desaturation increases as it dissolves
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(color.rgb, vec3(luma), p * 0.3);

    color *= visible;

    return color;
}
