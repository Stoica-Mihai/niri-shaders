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
    float ip = 1.0 - p;
    vec2 uv = coords_geo.xy;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
        return vec4(0.0);

    // Tracking — whole image shifts vertically, settling over time
    float tracking = sin(p * 15.0) * 0.06 * ip * ip;
    uv.y += tracking;

    // Horizontal tear — random rows shift sideways
    float tear_line = floor(uv.y * 60.0);
    float tear_hash = hash(vec2(tear_line, floor(p * 20.0)));
    float tear = 0.0;
    if (tear_hash > 0.85) {
        tear = (tear_hash - 0.85) * 0.8 * ip;
    }
    uv.x += tear;

    // Wavy wobble — VHS horizontal instability
    float wobble = sin(uv.y * 8.0 + p * 30.0) * 0.008 * ip;
    uv.x += wobble;

    // Wrap UVs for the shifted content
    uv = fract(uv);

    // Chromatic aberration — RGB channels split horizontally
    float split = 0.012 * ip;
    vec3 cr = niri_geo_to_tex * vec3(uv + vec2(split, 0.0), 1.0);
    vec3 cg = niri_geo_to_tex * vec3(uv, 1.0);
    vec3 cb = niri_geo_to_tex * vec3(uv - vec2(split, 0.0), 1.0);
    float r = texture2D(niri_tex, cr.st).r;
    float g = texture2D(niri_tex, cg.st).g;
    float b = texture2D(niri_tex, cb.st).b;
    float a = texture2D(niri_tex, cg.st).a;
    vec4 color = vec4(r, g, b, a);

    // VHS color warmth — slight desaturation + warm push
    float sat_loss = 0.15 * ip;
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(color.rgb, vec3(luma), sat_loss);
    color.rgb += vec3(0.04, 0.02, -0.02) * ip;

    // Scanlines
    float scanline = 0.5 + 0.5 * sin(uv.y * size_geo.y * 0.5 * 3.14159);
    color.rgb *= 1.0 - 0.15 * ip * scanline;

    // Static noise — heavy at start, fades
    float static_noise = hash(uv * size_geo.xy + vec2(p * 1000.0, p * 333.0));
    float noise_str = 0.35 * ip * ip;
    color.rgb = mix(color.rgb, vec3(static_noise), noise_str);

    // Tracking band — thick horizontal stripe of noise that scrolls down
    float band_pos = fract(p * 3.0);
    float band_dist = abs(uv.y - band_pos);
    float band = smoothstep(0.06, 0.0, band_dist) * ip;
    float band_noise = hash(vec2(uv.x * size_geo.x, floor(p * 100.0)));
    color.rgb = mix(color.rgb, vec3(band_noise * 0.8), band * 0.7);

    // Fade in
    color.a *= smoothstep(0.0, 0.2, p);

    return color;
}
