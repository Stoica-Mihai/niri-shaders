float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 hash2(vec2 p) {
    return vec2(hash(p), hash(p + vec2(37.0, 17.0)));
}

void voronoi(vec2 uv, out vec2 cell_id, out float edge_dist, out vec2 seed_pos) {
    vec2 base = floor(uv);
    float d1 = 999.0, d2 = 999.0;
    vec2 best_cell, best_seed;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 c = base + vec2(float(x), float(y));
            vec2 s = c + hash2(c * 1.7 + vec2(3.0, 7.0)) * 0.7 + 0.15;
            float d = length(uv - s);
            if (d < d1) { d2 = d1; d1 = d; best_cell = c; best_seed = s; }
            else if (d < d2) { d2 = d; }
        }
    }
    cell_id = best_cell;
    edge_dist = d2 - d1;
    seed_pos = best_seed;
}

vec2 screen_to_shard(vec2 sr, float ax, float ay) {
    float cx = cos(ax), sx = sin(ax);
    float cy = cos(ay), sy = sin(ay);

    // Rotated plane normal
    float nz = cx * cy;
    nz = sign(nz + 0.001) * max(abs(nz), 0.15);

    // Ray-plane intersection
    float t = -(cx * sy * sr.x - sx * sr.y) / nz;
    vec3 hit = vec3(sr, t);

    // Inverse Y then X rotation
    vec3 h = vec3(hit.x*cy - hit.z*sy, hit.y, hit.x*sy + hit.z*cy);
    return vec2(h.x, h.y*cx + h.z*sx);
}

vec4 open_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
        return vec4(0.0);

    vec2 grid = vec2(8.0, 6.0);
    vec2 scaled = uv * grid;

    // Voronoi
    vec2 cell;
    float edge_d;
    vec2 seed;
    voronoi(scaled, cell, edge_d, seed);
    vec2 seed_uv = seed / grid;

    // Staggered arrival: center shards arrive first
    float arrive_dist = length(seed_uv - 0.5);
    float delay = arrive_dist * 0.5;
    float sp = clamp((p - delay) / max(1.0 - delay, 0.01), 0.0, 1.0);
    float eased = 1.0 - (1.0 - sp) * (1.0 - sp) * (1.0 - sp);
    float ip = 1.0 - eased;

    // Scatter offset + 3D rotation
    vec2 sdir = normalize(seed_uv - 0.5 + (hash2(cell * 3.0) - 0.5) * 0.5 + vec2(0.001));
    vec2 offset = sdir * 0.25 * ip;
    float rot_ax = (hash(cell * 13.0) - 0.5) * 2.0 * ip;
    float rot_ay = (hash(cell * 17.0) - 0.5) * 2.0 * ip;

    // Inverse 3D transform to find original UV
    vec2 rel = uv - seed_uv - offset;
    vec2 shard_rel = screen_to_shard(rel, rot_ax, rot_ay);
    vec2 orig_uv = clamp(seed_uv + shard_rel, vec2(0.0), vec2(1.0));

    // Check validity (shard content visible)
    float valid = step(abs(shard_rel.x), 0.25) * step(abs(shard_rel.y), 0.25);

    // Sample texture
    vec3 ct = niri_geo_to_tex * vec3(orig_uv, 1.0);
    vec4 color = texture2D(niri_tex, ct.st);

    // 3D lighting
    float cx = cos(rot_ax), sx = sin(rot_ax);
    float cy = cos(rot_ay), sy = sin(rot_ay);
    vec3 normal = normalize(vec3(cx*sy, -sx, cx*cy));
    vec3 light = normalize(vec3(0.3, -0.5, 1.0));
    float diffuse = max(dot(normal, light), 0.2);
    float spec = pow(max(dot(reflect(-light, normal), vec3(0,0,1)), 0.0), 24.0);
    float tilt = 1.0 - abs(normal.z);

    color.rgb *= 0.65 + diffuse * 0.45;
    color.rgb += vec3(spec * 0.5 * max(tilt, 0.2));

    // Beveled glass edge — specular highlight at shard boundary
    float bevel = 1.0 - smoothstep(0.0, 0.06, edge_d);
    color.rgb += vec3(1.0, 0.95, 0.8) * bevel * (spec + 0.3) * 0.8;

    // Stained glass jewel tones — rich saturated colors per shard
    float hue = hash(cell + vec2(10.0, 20.0));
    vec3 jewel;
    // Cycle through cathedral palette: ruby, sapphire, emerald, amber, amethyst
    if (hue < 0.2) jewel = vec3(0.8, 0.05, 0.1);       // ruby red
    else if (hue < 0.4) jewel = vec3(0.05, 0.15, 0.85); // sapphire blue
    else if (hue < 0.55) jewel = vec3(0.05, 0.7, 0.2);  // emerald green
    else if (hue < 0.7) jewel = vec3(0.9, 0.7, 0.1);    // amber gold
    else if (hue < 0.85) jewel = vec3(0.55, 0.1, 0.75);  // amethyst purple
    else jewel = vec3(0.85, 0.3, 0.1);                   // warm orange

    // Luminous glass: tint the image through colored glass
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 glass = jewel * (luma * 1.4 + 0.15);
    // Strong tint when arriving, fades to real image
    float tint_amount = ip * 0.7 + 0.05 * (1.0 - p);
    color.rgb = mix(color.rgb, glass, tint_amount);

    // Shard visibility
    float vis = valid * smoothstep(0.0, 0.12, sp);
    color *= vis;

    // Lead framework (came) — thick dark lines at Voronoi edges
    float fw_line = smoothstep(0.04, 0.01, edge_d);
    float fw_glow = smoothstep(0.08, 0.0, edge_d);
    float fw_vis = smoothstep(0.0, 0.1, p) * (1.0 - smoothstep(0.82, 1.0, p));

    // Dark lead came with golden highlight
    vec3 lead = vec3(0.04, 0.04, 0.05);
    vec3 glow = vec3(0.5, 0.4, 0.15) * fw_glow * 0.4;
    vec4 fw = vec4(lead + glow, fw_line * fw_vis);

    // Composite: framework behind, shard on top
    color.rgb = mix(fw.rgb * fw.a, color.rgb, max(vis, 0.001));
    color.a = max(color.a, fw.a * (1.0 - vis));

    return color;
}
