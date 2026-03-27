float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 close_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
        return vec4(0.0);

    vec2 center = vec2(0.5);
    vec2 delta = uv - center;
    float dist = length(delta);
    vec2 dir = normalize(delta + vec2(0.0001));

    // Event horizon — grows slowly at first, accelerates at the end
    // Reaches full coverage (~0.75) exactly at p=1.0
    float horizon = 0.75 * smoothstep(0.0, 1.0, p * p * p);

    // Gravitational lensing — pull toward center, synced with horizon
    float pull = 0.35 * p * p / (dist + 0.08);
    vec2 lensed = uv - dir * pull * dist;

    // Spaghettification — stretch toward center
    float stretch = 1.0 + 3.0 * p * p * exp(-dist * 3.0);
    vec2 stretched = center + (lensed - center) / stretch;

    // Swirl — builds gradually
    float angle = p * p * 2.5 / (dist + 0.15);
    float s = sin(angle);
    float c = cos(angle);
    vec2 fc = stretched - center;
    stretched = center + vec2(fc.x * c - fc.y * s, fc.x * s + fc.y * c);

    if (stretched.x < 0.0 || stretched.x > 1.0 || stretched.y < 0.0 || stretched.y > 1.0)
        return vec4(0.0);

    // Sample texture
    vec3 coords_tex = niri_geo_to_tex * vec3(stretched, 1.0);
    vec4 color = texture2D(niri_tex, coords_tex.st);

    // Event horizon mask — content and hole are locked together
    float horizon_mask = smoothstep(horizon, horizon + 0.04, dist);
    color *= horizon_mask;

    // Fade content in sync — fully gone just as hole covers everything
    float content_fade = 1.0 - smoothstep(0.3, 0.9, p);
    color *= content_fade;

    // Accretion disk — follows the horizon edge
    float ring_dist = abs(dist - horizon - 0.015);
    float ring = exp(-ring_dist * ring_dist * 1200.0) * smoothstep(0.05, 0.3, p);
    vec3 acc_color = mix(vec3(1.0, 1.0, 0.9), vec3(1.0, 0.4, 0.02), smoothstep(0.0, 0.03, ring_dist));
    color.rgb += acc_color * ring * 2.0;

    // Outer ring
    float ring2_dist = abs(dist - horizon - 0.06);
    float ring2 = exp(-ring2_dist * ring2_dist * 300.0) * smoothstep(0.1, 0.4, p) * 0.5;
    color.rgb += vec3(0.8, 0.3, 0.05) * ring2;

    // Blueshift glow
    float blue = exp(-(dist - horizon) * 12.0) * p * 0.3;
    color.rgb += vec3(0.2, 0.4, 1.0) * blue * horizon_mask;

    // Light dimming
    color.rgb *= mix(1.0, 0.5, p * (1.0 - dist));

    // Particle noise around disk
    float noise = hash(uv * size_geo.xy + vec2(p * 500.0));
    float noise_ring = exp(-abs(dist - horizon - 0.04) * 20.0) * p;
    color.rgb += vec3(1.0, 0.7, 0.3) * noise * noise_ring * 0.25;

    return color;
}
