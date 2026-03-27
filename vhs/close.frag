float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 close_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
        return vec4(0.0);

    // Tracking goes haywire — image scrolls upward like losing signal
    float tracking = p * p * 0.4 + sin(p * 20.0) * 0.05 * p;
    uv.y += tracking;

    // Horizontal tears — get more frequent and severe
    float tear_line = floor(uv.y * 60.0);
    float tear_hash = hash(vec2(tear_line, floor(p * 25.0)));
    float tear = 0.0;
    if (tear_hash > mix(0.9, 0.5, p)) {
        tear = (tear_hash - 0.5) * 0.6 * p;
    }
    uv.x += tear;

    // Wavy wobble — intensifies
    float wobble = sin(uv.y * 10.0 + p * 40.0) * 0.015 * p;
    uv.x += wobble;

    uv = fract(uv);

    // Chromatic aberration — splits wider as tape degrades
    float split = 0.02 * p;
    vec3 cr = niri_geo_to_tex * vec3(uv + vec2(split, 0.0), 1.0);
    vec3 cg = niri_geo_to_tex * vec3(uv, 1.0);
    vec3 cb = niri_geo_to_tex * vec3(uv - vec2(split, 0.0), 1.0);
    float r = texture2D(niri_tex, cr.st).r;
    float g = texture2D(niri_tex, cg.st).g;
    float b = texture2D(niri_tex, cb.st).b;
    float a = texture2D(niri_tex, cg.st).a;
    vec4 color = vec4(r, g, b, a);

    // Color degrades — desaturation and warmth increase
    float sat_loss = 0.3 * p;
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(color.rgb, vec3(luma), sat_loss);
    color.rgb += vec3(0.05, 0.02, -0.03) * p;

    // Scanlines intensify
    float scanline = 0.5 + 0.5 * sin(uv.y * size_geo.y * 0.5 * 3.14159);
    color.rgb *= 1.0 - 0.25 * p * scanline;

    // Static noise takes over
    float static_noise = hash(uv * size_geo.xy + vec2(p * 1000.0, p * 333.0));
    float noise_str = p * p * 0.8;
    color.rgb = mix(color.rgb, vec3(static_noise), noise_str);

    // Tracking bands — multiple, getting thicker
    for (int i = 0; i < 3; i++) {
        float speed = 2.0 + float(i) * 1.5;
        float band_pos = fract(p * speed + float(i) * 0.33);
        float band_dist = abs(uv.y - band_pos);
        float thickness = mix(0.03, 0.08, p);
        float band = smoothstep(thickness, 0.0, band_dist) * p;
        float band_noise = hash(vec2(uv.x * size_geo.x, floor(p * 80.0) + float(i)));
        color.rgb = mix(color.rgb, vec3(band_noise * 0.6), band * 0.8);
    }

    // Fade to static
    color.a *= 1.0 - smoothstep(0.7, 1.0, p);

    return color;
}
