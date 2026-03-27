float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 open_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
        return vec4(0.0);

    float ip = 1.0 - p;

    vec2 center = vec2(0.5);
    vec2 delta = uv - center;
    float dist = length(delta);
    vec2 dir = normalize(delta + vec2(0.0001));

    // Big event horizon at start, shrinks to nothing
    float horizon = 0.4 * ip * ip;

    // Swirl — window content spirals out of the singularity
    float angle = ip * ip * 4.0 / (dist + 0.15);
    float s = sin(angle);
    float c = cos(angle);
    vec2 from_center = delta;
    vec2 swirled = center + vec2(
        from_center.x * c - from_center.y * s,
        from_center.x * s + from_center.y * c
    );

    // Gravitational lensing — pixels warped toward center
    float pull = 0.5 * ip * ip / (dist + 0.08);
    vec2 lensed = swirled - dir * pull * dist;

    // Spaghettification — stretch content from center outward
    float stretch = 1.0 + 4.0 * ip * exp(-dist * 3.0);
    vec2 final_uv = center + (lensed - center) / stretch;

    if (final_uv.x < 0.0 || final_uv.x > 1.0 || final_uv.y < 0.0 || final_uv.y > 1.0)
        return vec4(0.0);

    // Sample texture
    vec3 coords_tex = niri_geo_to_tex * vec3(final_uv, 1.0);
    vec4 color = texture2D(niri_tex, coords_tex.st);

    // Event horizon — black void that shrinks
    float horizon_mask = smoothstep(horizon, horizon + 0.03, dist);
    color *= horizon_mask;

    // Image emerges gradually
    float image_vis = smoothstep(0.15, 0.6, p);
    color *= image_vis;

    // Accretion disk — intense at start, fades
    float ring_dist = abs(dist - horizon - 0.02);
    float ring = exp(-ring_dist * ring_dist * 800.0) * ip;
    vec3 accretion_inner = vec3(1.0, 1.0, 0.9);
    vec3 accretion_outer = vec3(1.0, 0.4, 0.02);
    vec3 accretion_color = mix(accretion_inner, accretion_outer, smoothstep(0.0, 0.04, ring_dist));
    color.rgb += accretion_color * ring * 2.5;

    // Second ring — wider, dimmer
    float ring2_dist = abs(dist - horizon - 0.08);
    float ring2 = exp(-ring2_dist * ring2_dist * 200.0) * ip * 0.6;
    color.rgb += vec3(0.8, 0.3, 0.02) * ring2;

    // Blueshift glow near horizon
    float blue = exp(-(dist - horizon) * 10.0) * ip * 0.5;
    color.rgb += vec3(0.2, 0.4, 1.0) * blue * horizon_mask;

    // Particle noise spiraling around the disk
    float noise = hash(uv * size_geo.xy + vec2(p * 800.0));
    float noise_ring = exp(-abs(dist - horizon - 0.05) * 15.0) * ip;
    color.rgb += vec3(1.0, 0.6, 0.2) * noise * noise_ring * 0.4;

    // Light dimming from gravity — stronger when effect is active
    float dimming = mix(1.0, 0.4, ip * (1.0 - dist));
    color.rgb *= dimming;

    return color;
}
