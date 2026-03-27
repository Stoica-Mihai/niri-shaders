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

    float nz = cx * cy;
    nz = sign(nz + 0.001) * max(abs(nz), 0.15);

    float t = -(cx * sy * sr.x - sx * sr.y) / nz;
    vec3 hit = vec3(sr, t);

    vec3 h = vec3(hit.x*cy - hit.z*sy, hit.y, hit.x*sy + hit.z*cy);
    return vec2(h.x, h.y*cx + h.z*sx);
}

vec4 close_color(vec3 coords_geo, vec3 size_geo) {
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

    // Crack propagation from center
    float crack_dist = length(seed_uv - 0.5);
    float crack_time = crack_dist * 1.6;
    float sp = clamp((p - crack_time * 0.3) / max(1.0 - crack_time * 0.3, 0.01), 0.0, 1.0);

    // 3D rotation: tumble increases as shard breaks free
    float tumble = sp * sp;
    float rot_ax = (hash(cell * 13.0) - 0.5) * 2.5 * tumble;
    float rot_ay = (hash(cell * 17.0) - 0.5) * 2.5 * tumble;

    // Gravity fall + slight horizontal drift
    float fall_y = tumble * 0.4;
    float drift_x = (hash(cell * 7.0) - 0.5) * 0.15 * sp;
    // Slight spin acceleration
    rot_ax += sp * sp * sp * (hash(cell * 19.0) - 0.5) * 1.5;

    // Inverse 3D transform
    vec2 rel = uv - seed_uv - vec2(drift_x, fall_y);
    vec2 shard_rel = screen_to_shard(rel, rot_ax, rot_ay);
    vec2 orig_uv = clamp(seed_uv + shard_rel, vec2(0.0), vec2(1.0));

    // Validity check
    float valid = step(abs(shard_rel.x), 0.3) * step(abs(shard_rel.y), 0.3);

    // Sample texture
    vec3 ct = niri_geo_to_tex * vec3(orig_uv, 1.0);
    vec4 color = texture2D(niri_tex, ct.st);

    // 3D lighting — intensifies as shards tumble
    float cx = cos(rot_ax), sx = sin(rot_ax);
    float cy = cos(rot_ay), sy = sin(rot_ay);
    vec3 normal = normalize(vec3(cx*sy, -sx, cx*cy));
    vec3 light = normalize(vec3(0.3, -0.5, 1.0));
    float diffuse = max(dot(normal, light), 0.15);
    float spec = pow(max(dot(reflect(-light, normal), vec3(0,0,1)), 0.0), 24.0);
    float tilt = 1.0 - abs(normal.z);

    color.rgb *= 0.6 + diffuse * 0.5;
    color.rgb += vec3(spec * 0.6 * max(tilt, 0.15));

    // Beveled glass edge — catches light as shard tumbles
    float bevel = 1.0 - smoothstep(0.0, 0.06, edge_d);
    color.rgb += vec3(1.0, 0.95, 0.8) * bevel * (spec + 0.2) * tumble * 1.5;

    // Stained glass jewel tones — emerge as shards break free
    float hue = hash(cell + vec2(10.0, 20.0));
    vec3 jewel;
    if (hue < 0.2) jewel = vec3(0.8, 0.05, 0.1);
    else if (hue < 0.4) jewel = vec3(0.05, 0.15, 0.85);
    else if (hue < 0.55) jewel = vec3(0.05, 0.7, 0.2);
    else if (hue < 0.7) jewel = vec3(0.9, 0.7, 0.1);
    else if (hue < 0.85) jewel = vec3(0.55, 0.1, 0.75);
    else jewel = vec3(0.85, 0.3, 0.1);

    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 glass = jewel * (luma * 1.4 + 0.15);
    color.rgb = mix(color.rgb, glass, tumble * 0.7);

    // Crack lines — dark fractures that propagate before shards fall
    float crack_vis = smoothstep(crack_time * 0.3 - 0.06, crack_time * 0.3, p);
    float crack_line = smoothstep(0.02, 0.0, edge_d);
    // Crack glow (brief bright flash along crack)
    float crack_glow = smoothstep(0.03, 0.0, edge_d) *
        smoothstep(crack_time * 0.3 - 0.04, crack_time * 0.3, p) *
        (1.0 - smoothstep(crack_time * 0.3, crack_time * 0.3 + 0.08, p));

    color.rgb = mix(color.rgb, vec3(0.02), crack_line * crack_vis * 0.9);
    color.rgb += vec3(0.8, 0.7, 0.5) * crack_glow * 0.6;

    // Rim light on falling shards — light catches the edge
    float rim = pow(1.0 - abs(normal.z), 3.0) * tumble;
    color.rgb += vec3(0.4, 0.5, 0.7) * rim * 0.4;

    // Apply validity and fade
    color *= valid;
    color *= 1.0 - smoothstep(0.5, 1.0, sp);

    return color;
}
