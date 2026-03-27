#!/usr/bin/env python3
"""Render niri shader animations to GIF previews."""

import argparse
import struct
import sys
from pathlib import Path

import moderngl
import numpy as np
from PIL import Image

VERTEX_SHADER = """
#version 330
in vec2 in_pos;
out vec2 niri_v_coords;
void main() {
    niri_v_coords = in_pos * 0.5 + 0.5;
    gl_Position = vec4(in_pos, 0.0, 1.0);
}
"""

# Mimics niri's open/close prelude uniforms
FRAGMENT_PRELUDE = """
#version 330
precision highp float;

in vec2 niri_v_coords;
out vec4 frag_color;

uniform vec2 niri_size;
uniform mat3 niri_input_to_geo;
uniform vec2 niri_geo_size;
uniform sampler2D niri_tex;
uniform mat3 niri_geo_to_tex;
uniform float niri_progress;
uniform float niri_clamped_progress;
uniform float niri_random_seed;
uniform float niri_alpha;
uniform float niri_scale;

// Compatibility: GLSL 330 uses texture() not texture2D()
#define texture2D texture
"""

FRAGMENT_EPILOGUE_OPEN = """
void main() {
    vec3 coords_geo = niri_input_to_geo * vec3(niri_v_coords, 1.0);
    vec3 size_geo = vec3(niri_geo_size, 1.0);
    vec4 color = open_color(coords_geo, size_geo);
    color = color * niri_alpha;
    frag_color = color;
}
"""

FRAGMENT_EPILOGUE_CLOSE = """
void main() {
    vec3 coords_geo = niri_input_to_geo * vec3(niri_v_coords, 1.0);
    vec3 size_geo = vec3(niri_geo_size, 1.0);
    vec4 color = close_color(coords_geo, size_geo);
    color = color * niri_alpha;
    frag_color = color;
}
"""


def load_shader(frag_path: Path) -> tuple[str, str]:
    """Load a .frag file and determine if it's open or close."""
    code = frag_path.read_text()
    if "open_color" in code:
        anim_type = "open"
    elif "close_color" in code:
        anim_type = "close"
    else:
        raise ValueError(f"Cannot determine animation type from {frag_path}")
    return code, anim_type


def render_animation(
    ctx: moderngl.Context,
    frag_code: str,
    anim_type: str,
    texture_img: Image.Image,
    width: int,
    height: int,
    num_frames: int,
    random_seed: float = 0.42,
) -> list[Image.Image]:
    """Render animation frames."""
    epilogue = FRAGMENT_EPILOGUE_OPEN if anim_type == "open" else FRAGMENT_EPILOGUE_CLOSE
    fragment_src = FRAGMENT_PRELUDE + frag_code + epilogue

    try:
        prog = ctx.program(vertex_shader=VERTEX_SHADER, fragment_shader=fragment_src)
    except Exception as e:
        print(f"  Shader compile error: {e}", file=sys.stderr)
        return []

    # Fullscreen quad
    verts = np.array([-1, -1, 1, -1, -1, 1, 1, 1], dtype="f4")
    vbo = ctx.buffer(verts)
    vao = ctx.vertex_array(prog, [(vbo, "2f", "in_pos")])

    # Framebuffer
    fbo = ctx.framebuffer(color_attachments=[ctx.texture((width, height), 4)])

    # Upload texture (flip vertically for OpenGL)
    tex_img = texture_img.resize((width, height)).convert("RGBA").transpose(Image.FLIP_TOP_BOTTOM)
    tex = ctx.texture((width, height), 4, tex_img.tobytes())
    tex.use(0)

    # Set static uniforms
    if "niri_size" in prog:
        prog["niri_size"].value = (float(width), float(height))
    if "niri_geo_size" in prog:
        prog["niri_geo_size"].value = (float(width), float(height))
    if "niri_alpha" in prog:
        prog["niri_alpha"].value = 1.0
    if "niri_scale" in prog:
        prog["niri_scale"].value = 1.0
    if "niri_random_seed" in prog:
        prog["niri_random_seed"].value = random_seed
    if "niri_tex" in prog:
        prog["niri_tex"].value = 0

    # niri_input_to_geo: identity (maps niri_v_coords [0,1] to geo [0,1])
    if "niri_input_to_geo" in prog:
        prog["niri_input_to_geo"].value = (1, 0, 0, 0, 1, 0, 0, 0, 1)

    # niri_geo_to_tex: identity (geo coords map directly to tex coords)
    if "niri_geo_to_tex" in prog:
        prog["niri_geo_to_tex"].value = (1, 0, 0, 0, 1, 0, 0, 0, 1)

    frames = []
    for i in range(num_frames):
        progress = i / max(num_frames - 1, 1)

        if "niri_progress" in prog:
            prog["niri_progress"].value = progress
        if "niri_clamped_progress" in prog:
            prog["niri_clamped_progress"].value = max(0.0, min(1.0, progress))

        fbo.use()
        ctx.clear(0.0, 0.0, 0.0, 0.0)
        vao.render(moderngl.TRIANGLE_STRIP)

        data = fbo.read(components=4)
        img = Image.frombytes("RGBA", (width, height), data).transpose(Image.FLIP_TOP_BOTTOM)

        # Composite over dark background
        bg = Image.new("RGBA", (width, height), (24, 24, 28, 255))
        bg.paste(img, (0, 0), img)
        frames.append(bg.convert("RGB"))

    # Cleanup
    vao.release()
    vbo.release()
    fbo.release()
    tex.release()
    prog.release()

    return frames


def create_animation(frames: list[Image.Image], output_path: Path, fps: int = 30, fmt: str = "webp"):
    """Save frames as animated WebP or GIF."""
    if not frames:
        return
    duration = int(1000 / fps)
    if fmt == "webp":
        frames[0].save(
            output_path,
            save_all=True,
            append_images=frames[1:],
            duration=duration,
            loop=0,
            quality=90,
            method=4,
        )
    else:
        frames[0].save(
            output_path,
            save_all=True,
            append_images=frames[1:],
            duration=duration,
            loop=0,
            optimize=True,
        )


def main():
    parser = argparse.ArgumentParser(description="Render niri shader animations to GIF")
    parser.add_argument("theme", nargs="?", help="Theme directory name (renders all if omitted)")
    parser.add_argument("-i", "--image", default=None, help="Source image for texture (default: built-in gradient)")
    parser.add_argument("-W", "--width", type=int, default=640, help="Output width (default: 640)")
    parser.add_argument("-H", "--height", type=int, default=400, help="Output height (default: 400)")
    parser.add_argument("-f", "--frames", type=int, default=60, help="Number of frames (default: 60)")
    parser.add_argument("--fps", type=int, default=30, help="Framerate (default: 30)")
    parser.add_argument("--format", choices=["webp", "gif"], default="webp", help="Output format (default: webp)")
    parser.add_argument("-o", "--output-dir", default=None, help="Output directory (default: theme dir)")
    args = parser.parse_args()

    repo_root = Path(__file__).parent.parent

    # Find themes
    if args.theme:
        themes = [repo_root / args.theme]
        if not themes[0].is_dir():
            print(f"Theme not found: {args.theme}", file=sys.stderr)
            sys.exit(1)
    else:
        themes = sorted(
            d for d in repo_root.iterdir()
            if d.is_dir() and (d / "open.frag").exists()
        )

    if not themes:
        print("No themes found", file=sys.stderr)
        sys.exit(1)

    # Load or generate source image
    if args.image:
        src_img = Image.open(args.image).convert("RGBA")
    else:
        # Generate a colorful test image
        w, h = args.width, args.height
        img = Image.new("RGBA", (w, h))
        pixels = img.load()
        for y in range(h):
            for x in range(w):
                r = int(80 + 140 * x / w + 30 * np.sin(y * 0.05))
                g = int(60 + 120 * y / h + 20 * np.sin(x * 0.08))
                b = int(100 + 100 * np.sin(x * 0.03 + y * 0.02))
                pixels[x, y] = (
                    max(0, min(255, r)),
                    max(0, min(255, g)),
                    max(0, min(255, b)),
                    255,
                )
        src_img = img

    # Create headless OpenGL context
    ctx = moderngl.create_standalone_context(require=330)

    for theme_dir in themes:
        theme_name = theme_dir.name
        out_dir = Path(args.output_dir) if args.output_dir else theme_dir
        out_dir.mkdir(parents=True, exist_ok=True)

        print(f"Rendering: {theme_name}")

        for frag_name in ["open.frag", "close.frag"]:
            frag_path = theme_dir / frag_name
            if not frag_path.exists():
                continue

            anim_name = frag_name.replace(".frag", "")
            print(f"  {anim_name}...", end=" ", flush=True)

            frag_code, anim_type = load_shader(frag_path)
            frames = render_animation(
                ctx, frag_code, anim_type, src_img,
                args.width, args.height, args.frames,
            )

            if frames:
                ext = args.format
                out_path = out_dir / f"preview-{anim_name}.{ext}"
                create_animation(frames, out_path, args.fps, ext)
                print(f"OK → {out_path}")
            else:
                print("FAILED")

    ctx.release()
    print("Done!")


if __name__ == "__main__":
    main()
