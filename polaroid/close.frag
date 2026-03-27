vec4 close_color(vec3 coords_geo, vec3 size_geo) {
    float p = niri_clamped_progress;
    vec2 uv = coords_geo.xy;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
        return vec4(0.0);

    vec3 coords_tex = niri_geo_to_tex * vec3(uv, 1.0);
    vec4 color = texture2D(niri_tex, coords_tex.st);

    // Quick desaturate + fade
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(color.rgb, vec3(luma), p);
    color *= 1.0 - p;

    return color;
}
