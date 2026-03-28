float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 cexp_i(float theta) {
    return vec2(cos(theta), sin(theta));
}

vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(vec3(c.x) + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - vec3(3.0));
    return c.z * mix(vec3(1.0), clamp(p - vec3(1.0), 0.0, 1.0), c.y);
}

vec4 close_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    // Extra margin for tunneling ghosts
    if (uv.x < -0.04 || uv.x > 1.04 || uv.y < -0.04 || uv.y > 1.04)
        return vec4(0.0);

    float t = p * 10.0;

    // === THREE VISIBLE GHOST COPIES that split apart ===
    // Each copy drifts in a different direction as p increases
    float split = smoothstep(0.0, 0.5, p);
    float spread = split * 0.15;

    vec2 offsets[3];
    offsets[0] = vec2(-0.7, -0.4) * spread;
    offsets[1] = vec2( 0.5, -0.6) * spread;
    offsets[2] = vec2( 0.1,  0.8) * spread;

    // Wave vectors for each copy (determines interference pattern)
    vec2 k0 = vec2(4.0, 2.5);
    vec2 k1 = vec2(-3.0, 4.0);
    vec2 k2 = vec2(2.0, -3.5);

    // Sum complex amplitudes for interference
    vec2 psi = vec2(0.0);
    vec4 color = vec4(0.0);

    for (int i = 0; i < 3; i++) {
        vec2 off = offsets[i];
        vec2 k;
        if (i == 0) k = k0;
        else if (i == 1) k = k1;
        else k = k2;

        vec2 copy_uv = uv - off;

        // Check if this copy is within window bounds
        if (copy_uv.x < 0.0 || copy_uv.x > 1.0 || copy_uv.y < 0.0 || copy_uv.y > 1.0)
            continue;

        // Sample the window texture for this copy
        vec3 tex_coords = niri_geo_to_tex * vec3(copy_uv, 1.0);
        vec4 tex = texture2D(niri_tex, tex_coords.st);

        // Wave function phase for this eigenstate
        float phase = dot(k, uv * 6.0) - dot(k, k) * 0.5 * t;
        vec2 psi_k = cexp_i(phase) * 0.577; // Equal amplitudes, 1/sqrt(3)

        // Add random decoherence phase as p increases
        float deco = p * p * 12.0 * hash(vec2(float(i) * 5.3, niri_random_seed));
        psi_k = vec2(psi_k.x * cos(deco) - psi_k.y * sin(deco),
                     psi_k.x * sin(deco) + psi_k.y * cos(deco));

        psi += psi_k;

        // Each copy rendered as a translucent ghost
        float copy_alpha = 0.5 * (1.0 - p * 0.7);

        // Per-copy color tint
        float hue = float(i) * 0.33;
        vec3 tint = hsv2rgb(vec3(hue, 0.35 * split, 1.0));

        color.rgb += tex.rgb * tint * copy_alpha;
        color.a += tex.a * copy_alpha;
    }

    // === SMOOTH FADE ===
    color *= (1.0 - smoothstep(0.5, 1.0, p));

    // === QUANTUM GLOW ===
    float glow = split * 0.08 * (1.0 - p);
    color.rgb += vec3(0.15, 0.3, 0.8) * glow;

    // === QUANTUM TUNNELING beyond boundaries ===
    float bd = 0.0;
    if (uv.x < 0.0) bd = -uv.x;
    if (uv.x > 1.0) bd = max(bd, uv.x - 1.0);
    if (uv.y < 0.0) bd = max(bd, -uv.y);
    if (uv.y > 1.0) bd = max(bd, uv.y - 1.0);

    if (bd > 0.0) {
        float tunnel = exp(-bd * (30.0 + 60.0 * p)) * (1.0 - p) * 0.4;
        vec2 ghost_uv = clamp(uv, vec2(0.0), vec2(1.0));
        vec3 gt = niri_geo_to_tex * vec3(ghost_uv, 1.0);
        vec4 ghost = texture2D(niri_tex, gt.st);
        // Ghostly blue-purple tunneling glow
        float ghost_phase = dot(k0, uv * 10.0) - t * 2.0;
        ghost.rgb *= hsv2rgb(vec3(fract(ghost_phase / 6.28), 0.6, 1.0));
        return ghost * tunnel;
    }

    // === DECOHERENCE FADE at the end ===
    float dissolve = 1.0 - smoothstep(0.6, 1.0, p);
    color *= dissolve;

    // === MEASUREMENT FLASH ===
    float flash = exp(-(p - 0.3) * (p - 0.3) * 60.0) * 0.4;
    color.rgb += vec3(0.3, 0.5, 1.0) * flash;

    // Overall fade
    color *= 1.0 - smoothstep(0.85, 1.0, p);
    color.a = clamp(color.a, 0.0, 1.0);

    return color;
}
