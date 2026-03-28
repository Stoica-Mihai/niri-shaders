float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// 4D vertex: returns one of 16 tesseract vertices (+-1, +-1, +-1, +-1)
vec4 vert(int i) {
    float x = mod(float(i), 2.0) < 0.5 ? -1.0 : 1.0;
    float y = mod(floor(float(i) / 2.0), 2.0) < 0.5 ? -1.0 : 1.0;
    float z = mod(floor(float(i) / 4.0), 2.0) < 0.5 ? -1.0 : 1.0;
    float w = mod(floor(float(i) / 8.0), 2.0) < 0.5 ? -1.0 : 1.0;
    return vec4(x, y, z, w);
}

// 4D rotation in XW plane
vec4 rotXW(vec4 v, float a) {
    float c = cos(a); float s = sin(a);
    return vec4(v.x * c - v.w * s, v.y, v.z, v.x * s + v.w * c);
}

// 4D rotation in YW plane
vec4 rotYW(vec4 v, float a) {
    float c = cos(a); float s = sin(a);
    return vec4(v.x, v.y * c - v.w * s, v.z, v.y * s + v.w * c);
}

// 4D rotation in ZW plane
vec4 rotZW(vec4 v, float a) {
    float c = cos(a); float s = sin(a);
    return vec4(v.x, v.y, v.z * c - v.w * s, v.z * s + v.w * c);
}

// 4D rotation in XY plane
vec4 rotXY(vec4 v, float a) {
    float c = cos(a); float s = sin(a);
    return vec4(v.x * c - v.y * s, v.x * s + v.y * c, v.z, v.w);
}

// Double projection: 4D -> 3D -> 2D
vec2 project4D(vec4 v, float cam4d, float cam3d) {
    float dw = cam4d - v.w;
    if (dw < 0.1) dw = 0.1;
    float scale4 = cam4d / dw;
    vec3 p3 = v.xyz * scale4;

    float dz = cam3d - p3.z;
    if (dz < 0.1) dz = 0.1;
    float scale3 = cam3d / dz;
    return p3.xy * scale3;
}

// Minimum distance from point to line segment
float distToSegment(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    float len2 = dot(ab, ab);
    if (len2 < 0.0001) return length(p - a);
    float t = clamp(dot(p - a, ab) / len2, 0.0, 1.0);
    vec2 proj = a + t * ab;
    return length(p - proj);
}

// Check if point is inside a projected quad
float pointInQuad(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d) {
    float c0 = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    float c1 = (c.x - b.x) * (p.y - b.y) - (c.y - b.y) * (p.x - b.x);
    float c2 = (d.x - c.x) * (p.y - c.y) - (d.y - c.y) * (p.x - c.x);
    float c3 = (a.x - d.x) * (p.y - d.y) - (a.y - d.y) * (p.x - d.x);
    if (c0 >= 0.0 && c1 >= 0.0 && c2 >= 0.0 && c3 >= 0.0) return 1.0;
    if (c0 <= 0.0 && c1 <= 0.0 && c2 <= 0.0 && c3 <= 0.0) return 1.0;
    return 0.0;
}

// Compute UV within a projected quad via iterative bilinear inverse
vec2 quadUV(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d) {
    vec2 ab = b - a;
    vec2 dc = c - d;
    float u = 0.5, v = 0.5;
    for (int i = 0; i < 3; i++) {
        vec2 bot = mix(a, b, u);
        vec2 top = mix(d, c, u);
        vec2 pt = mix(bot, top, v);
        vec2 diff = p - pt;

        vec2 du = mix(ab, dc, v);
        vec2 dv = top - bot;

        float det = du.x * dv.y - du.y * dv.x;
        if (abs(det) < 0.0001) break;
        u += (diff.x * dv.y - diff.y * dv.x) / det;
        v += (du.x * diff.y - du.y * diff.x) / det;
    }
    return vec2(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0));
}

vec4 open_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    // Inverse progress: at p=0 the tesseract is rotated away, at p=1 it's flat
    float ip = 1.0 - p;

    // Map UV to centered coordinates for projection
    vec2 screen = (uv - 0.5) * 2.8;

    // Camera distances for double projection
    float cam4d = 4.0;
    float cam3d = 5.0;

    // 4D rotation angles driven by inverse progress
    // Open: starts folded in 4D (ip=1), unfolds to flat (ip=0)
    float axw = ip * 1.5707963;  // pi/2
    float ayw = ip * 1.0471976;  // pi/3
    float azw = ip * 0.7853982;  // pi/4
    float axy = ip * 0.3926991;  // pi/8

    vec4 result = vec4(0.0);

    // --- Front face: the window texture face ---
    vec4 fv0 = vert(0);  // (-1,-1,-1,-1)
    vec4 fv1 = vert(1);  // ( 1,-1,-1,-1)
    vec4 fv2 = vert(3);  // ( 1, 1,-1,-1)
    vec4 fv3 = vert(2);  // (-1, 1,-1,-1)

    fv0 = rotXY(rotZW(rotYW(rotXW(fv0, axw), ayw), azw), axy);
    fv1 = rotXY(rotZW(rotYW(rotXW(fv1, axw), ayw), azw), axy);
    fv2 = rotXY(rotZW(rotYW(rotXW(fv2, axw), ayw), azw), axy);
    fv3 = rotXY(rotZW(rotYW(rotXW(fv3, axw), ayw), azw), axy);

    vec2 fp0 = project4D(fv0, cam4d, cam3d);
    vec2 fp1 = project4D(fv1, cam4d, cam3d);
    vec2 fp2 = project4D(fv2, cam4d, cam3d);
    vec2 fp3 = project4D(fv3, cam4d, cam3d);

    float front_depth = (fv0.z + fv0.w + fv1.z + fv1.w + fv2.z + fv2.w + fv3.z + fv3.w) / 8.0;

    float in_front = pointInQuad(screen, fp0, fp1, fp2, fp3);

    // --- Render all 32 edges as glowing line segments ---
    float edge_glow = 0.0;
    float edge_width = mix(0.04, 0.025, p);

    for (int i = 0; i < 16; i++) {
        vec4 vi = vert(i);
        vi = rotXY(rotZW(rotYW(rotXW(vi, axw), ayw), azw), axy);
        vec2 pi2d = project4D(vi, cam4d, cam3d);

        for (int bit = 0; bit < 4; bit++) {
            int mask;
            if (bit == 0) mask = 1;
            else if (bit == 1) mask = 2;
            else if (bit == 2) mask = 4;
            else mask = 8;

            int j = i + mask;
            bool bit_clear;
            if (bit == 0) bit_clear = mod(float(i), 2.0) < 0.5;
            else if (bit == 1) bit_clear = mod(floor(float(i) / 2.0), 2.0) < 0.5;
            else if (bit == 2) bit_clear = mod(floor(float(i) / 4.0), 2.0) < 0.5;
            else bit_clear = mod(floor(float(i) / 8.0), 2.0) < 0.5;

            if (bit_clear && j < 16) {
                vec4 vj = vert(j);
                vj = rotXY(rotZW(rotYW(rotXW(vj, axw), ayw), azw), axy);
                vec2 pj2d = project4D(vj, cam4d, cam3d);

                float d = distToSegment(screen, pi2d, pj2d);
                float glow = exp(-d * d / (edge_width * edge_width)) * 0.6;

                float avg_depth = (vi.z + vi.w + vj.z + vj.w) * 0.25;
                float depth_fade = smoothstep(-3.0, 2.0, avg_depth);
                glow *= mix(0.3, 1.0, depth_fade);

                edge_glow += glow;
            }
        }
    }

    vec3 edge_color = mix(vec3(0.1, 0.5, 1.0), vec3(0.0, 0.9, 1.0), smoothstep(0.0, 1.5, edge_glow));
    edge_glow = min(edge_glow, 2.5);

    // --- Window texture on front face ---
    if (in_front > 0.5) {
        vec2 face_uv = quadUV(screen, fp0, fp1, fp2, fp3);
        vec3 coords_tex = niri_geo_to_tex * vec3(face_uv, 1.0);
        vec4 tex_color = texture2D(niri_tex, coords_tex.st);

        // Window content emerges as it unfolds
        float face_vis = smoothstep(0.15, 0.7, p);

        // Blue tint fades as it materializes
        tex_color.rgb = mix(tex_color.rgb * vec3(0.7, 0.8, 1.0), tex_color.rgb, p);

        result = tex_color * face_vis;
    }

    // --- Translucent glass faces ---

    // Back face (w=+1 cell)
    vec4 bv0 = vert(8);
    vec4 bv1 = vert(9);
    vec4 bv2 = vert(11);
    vec4 bv3 = vert(10);

    bv0 = rotXY(rotZW(rotYW(rotXW(bv0, axw), ayw), azw), axy);
    bv1 = rotXY(rotZW(rotYW(rotXW(bv1, axw), ayw), azw), axy);
    bv2 = rotXY(rotZW(rotYW(rotXW(bv2, axw), ayw), azw), axy);
    bv3 = rotXY(rotZW(rotYW(rotXW(bv3, axw), ayw), azw), axy);

    vec2 bp0 = project4D(bv0, cam4d, cam3d);
    vec2 bp1 = project4D(bv1, cam4d, cam3d);
    vec2 bp2 = project4D(bv2, cam4d, cam3d);
    vec2 bp3 = project4D(bv3, cam4d, cam3d);

    float back_depth = (bv0.z + bv0.w + bv1.z + bv1.w + bv2.z + bv2.w + bv3.z + bv3.w) / 8.0;
    float in_back = pointInQuad(screen, bp0, bp1, bp2, bp3);

    if (in_back > 0.5 && (in_front < 0.5 || back_depth > front_depth)) {
        vec3 glass_color = vec3(0.05, 0.15, 0.3);
        float glass_alpha = 0.25 * smoothstep(0.0, 0.4, ip);
        result = mix(result, vec4(glass_color, glass_alpha), glass_alpha);
    }

    // Side face (x=+1)
    vec4 sv0 = vert(1);
    vec4 sv1 = vert(9);
    vec4 sv2 = vert(11);
    vec4 sv3 = vert(3);

    sv0 = rotXY(rotZW(rotYW(rotXW(sv0, axw), ayw), azw), axy);
    sv1 = rotXY(rotZW(rotYW(rotXW(sv1, axw), ayw), azw), axy);
    sv2 = rotXY(rotZW(rotYW(rotXW(sv2, axw), ayw), azw), axy);
    sv3 = rotXY(rotZW(rotYW(rotXW(sv3, axw), ayw), azw), axy);

    vec2 sp0 = project4D(sv0, cam4d, cam3d);
    vec2 sp1 = project4D(sv1, cam4d, cam3d);
    vec2 sp2 = project4D(sv2, cam4d, cam3d);
    vec2 sp3 = project4D(sv3, cam4d, cam3d);

    float side_depth = (sv0.z + sv0.w + sv1.z + sv1.w + sv2.z + sv2.w + sv3.z + sv3.w) / 8.0;
    float in_side = pointInQuad(screen, sp0, sp1, sp2, sp3);

    if (in_side > 0.5 && (in_front < 0.5 || side_depth > front_depth)) {
        vec3 glass_color = vec3(0.1, 0.2, 0.35);
        float glass_alpha = 0.2 * smoothstep(0.0, 0.4, ip);
        result = mix(result, vec4(glass_color, glass_alpha), glass_alpha);
    }

    // Top face (y=+1)
    vec4 tv0 = vert(2);
    vec4 tv1 = vert(3);
    vec4 tv2 = vert(11);
    vec4 tv3 = vert(10);

    tv0 = rotXY(rotZW(rotYW(rotXW(tv0, axw), ayw), azw), axy);
    tv1 = rotXY(rotZW(rotYW(rotXW(tv1, axw), ayw), azw), axy);
    tv2 = rotXY(rotZW(rotYW(rotXW(tv2, axw), ayw), azw), axy);
    tv3 = rotXY(rotZW(rotYW(rotXW(tv3, axw), ayw), azw), axy);

    vec2 tp0 = project4D(tv0, cam4d, cam3d);
    vec2 tp1 = project4D(tv1, cam4d, cam3d);
    vec2 tp2 = project4D(tv2, cam4d, cam3d);
    vec2 tp3 = project4D(tv3, cam4d, cam3d);

    float top_depth = (tv0.z + tv0.w + tv1.z + tv1.w + tv2.z + tv2.w + tv3.z + tv3.w) / 8.0;
    float in_top = pointInQuad(screen, tp0, tp1, tp2, tp3);

    if (in_top > 0.5 && (in_front < 0.5 || top_depth > front_depth)) {
        vec3 glass_color = vec3(0.08, 0.18, 0.32);
        float glass_alpha = 0.2 * smoothstep(0.0, 0.4, ip);
        result = mix(result, vec4(glass_color, glass_alpha), glass_alpha);
    }

    // Edge glow — strongest when tesseract is visible, fades as window flattens
    float edge_vis = smoothstep(0.8, 0.0, p);
    result.rgb += edge_color * edge_glow * edge_vis;
    result.a = max(result.a, edge_glow * 0.4 * edge_vis);

    // Dimensional shimmer
    float noise = hash(screen * size_geo.xy * 0.5 + vec2(p * 300.0));
    float sparkle = edge_glow * noise * 0.3 * ip;
    result.rgb += vec3(0.5, 0.8, 1.0) * sparkle;

    // Fade in from nothing at the very start
    float master_fade = smoothstep(0.0, 0.3, p);
    result *= master_fade;

    // Clip to window bounds with margin for glow
    float margin = 0.15;
    if (uv.x < -margin || uv.x > 1.0 + margin || uv.y < -margin || uv.y > 1.0 + margin)
        return vec4(0.0);

    return result;
}
