float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 hash2(vec2 p) {
    return vec2(hash(p), hash(p + vec2(37.0, 17.0)));
}

float tab_mod(float sdf, vec2 lc, vec2 cc, vec2 nc, vec2 nh, float is_tab) {
    float circ = length(lc - cc) - 0.12;
    vec2 d = abs(lc - nc) - nh;
    float neck = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    float shape = min(circ, neck);
    return mix(max(sdf, -shape), min(sdf, shape), is_tab);
}

float piece_sdf(vec2 lc, vec2 cell) {
    vec2 d = abs(lc - 0.5) - 0.5;
    float sdf = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);

    float td = 0.10;
    float nw = 0.055;

    float ra = step(cell.x, 2.5);
    float hr = step(0.5, hash(cell + vec2(100.0, 200.0)));
    sdf = mix(sdf, tab_mod(sdf, lc,
        vec2(mix(1.0+td, 1.0-td, hr), 0.5),
        vec2(mix(1.0+td*0.5, 1.0-td*0.5, hr), 0.5),
        vec2(td*0.5, nw), 1.0-hr), ra);

    float la = 1.0 - step(cell.x, 0.5);
    float hl = step(0.5, hash(vec2(cell.x-1.0, cell.y) + vec2(100.0, 200.0)));
    sdf = mix(sdf, tab_mod(sdf, lc,
        vec2(mix(td, -td, hl), 0.5),
        vec2(mix(td*0.5, -td*0.5, hl), 0.5),
        vec2(td*0.5, nw), hl), la);

    float ba = step(cell.y, 1.5);
    float hb = step(0.5, hash(cell + vec2(300.0, 400.0)));
    sdf = mix(sdf, tab_mod(sdf, lc,
        vec2(0.5, mix(1.0+td, 1.0-td, hb)),
        vec2(0.5, mix(1.0+td*0.5, 1.0-td*0.5, hb)),
        vec2(nw, td*0.5), 1.0-hb), ba);

    float ta = 1.0 - step(cell.y, 0.5);
    float ht = step(0.5, hash(vec2(cell.x, cell.y-1.0) + vec2(300.0, 400.0)));
    sdf = mix(sdf, tab_mod(sdf, lc,
        vec2(0.5, mix(td, -td, ht)),
        vec2(0.5, mix(td*0.5, -td*0.5, ht)),
        vec2(nw, td*0.5), ht), ta);

    return sdf;
}

vec4 close_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    vec2 grid = vec2(4.0, 3.0);
    vec2 base_cell = floor(clamp(uv, vec2(0.0), vec2(0.999)) * grid);

    vec4 result = vec4(0.0);
    float best = 999.0;

    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            vec2 cell = base_cell + vec2(float(dx), float(dy));
            if (cell.x < 0.0 || cell.x >= grid.x || cell.y < 0.0 || cell.y >= grid.y)
                continue;

            vec2 cn = (cell + 0.5) / grid;
            vec2 sdir = normalize(cn - 0.5 + (hash2(cell * 7.0 + vec2(13.0, 29.0)) - 0.5) + vec2(0.001));

            float delay = hash(cell * 3.0 + vec2(5.0, 11.0)) * 0.2;
            float pp = clamp((p - delay) / (1.0 - delay), 0.0, 1.0);
            float eased = pp * pp;

            vec2 offset = sdir * 0.18 * eased;
            float angle = (hash(cell * 11.0 + vec2(7.0, 3.0)) - 0.5) * 0.5 * eased;

            vec2 rel = uv - cn - offset;
            float ca = cos(-angle);
            float sa = sin(-angle);
            vec2 ur = vec2(rel.x*ca - rel.y*sa, rel.x*sa + rel.y*ca);
            vec2 lc = ur * grid + vec2(0.5);

            if (lc.x < -0.25 || lc.x > 1.25 || lc.y < -0.25 || lc.y > 1.25)
                continue;

            float sdf = piece_sdf(lc, cell);
            if (sdf < 0.005 && sdf < best) {
                best = sdf;

                vec2 tex_uv = clamp((cell + lc) / grid, vec2(0.0), vec2(1.0));
                vec3 ct = niri_geo_to_tex * vec3(tex_uv, 1.0);
                vec4 color = texture2D(niri_tex, ct.st);

                float aa = smoothstep(0.005, -0.005, sdf);
                float outline = smoothstep(0.02, 0.0, abs(sdf)) * 0.4 * eased;
                color.rgb *= 1.0 - outline;

                // Fade out
                float fade = 1.0 - smoothstep(0.6, 1.0, pp);
                color *= aa * fade;

                result = color;
            }
        }
    }

    return result;
}
