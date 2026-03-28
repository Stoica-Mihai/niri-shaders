# Dimensional Rift

Fractal tear with volumetric raymarching for niri window animations.

## Preview

| Open | Close |
|------|-------|
| ![open](preview-open.webp) | ![close](preview-close.webp) |

## Features

- **Fractal tear path (Lichtenberg figure)** -- Domain-warped FBM noise generates a branching fracture pattern from the center, resembling an electrical discharge. The tear is defined as a signed distance field with a main spine and three branching arms.
- **Cloth curl-back at torn edges** -- Pixels near the tear boundary are UV-warped to simulate fabric bending backward. The "back side" of the curl renders as a darkened, purple-tinted version of the texture, creating the illusion of torn material peeling away.
- **Volumetric raymarching** -- Behind the tear, a 20-step raymarch accumulates density from 3D FBM noise to render a foggy other-dimensional void. Deep purples and dark blues dominate, with bright floating specks acting as particle debris.
- **Procedural lightning** -- Six multi-segment lightning bolts trace along the tear boundary using capsule SDFs. Each bolt segment is jittered with hash-based randomness and flickers independently.
- **Chromatic aberration** -- Near the tear, R/G/B channels are sampled at offset coordinates, producing a prismatic rainbow fringe effect that intensifies at the fracture boundary.
- **Edge glow** -- A dual-layer glow system: a broad cyan glow with exponential falloff from the tear SDF, plus a tight white-hot edge highlight.
- **Particle debris** -- Procedurally placed bright dots visible both in the raymarched void volume and near the tear edges, using hash-based placement with flicker animation.

## Rendering Pipeline

Each pixel passes through a multi-stage pipeline:

1. **Fracture SDF evaluation** -- 5-octave domain-warped FBM computes the distance to the nearest fracture path
2. **Region classification** -- Negative SDF pixels enter the void pipeline; positive SDF pixels enter the window pipeline
3. **Void pipeline** -- Volumetric raymarching (20 steps) with 3D FBM density, particle debris, edge glow, and lightning overlay
4. **Window pipeline** -- Cloth curl UV warping, chromatic aberration (3 texture samples), back-side darkening, edge glow, and lightning overlay
5. **Compositing** -- Alpha blending with progressive fade based on animation progress

## Usage

Add the following to your `~/.config/niri/config.kdl` inside the `animations` block:

```kdl
animations {
    window-open {
        duration-ms 800
        curve "linear"
        custom-shader r"
            // paste contents of open.frag here
        "
    }

    window-close {
        duration-ms 700
        curve "linear"
        custom-shader r"
            // paste contents of close.frag here
        "
    }
}
```

Or use the install script from the repo root:

```sh
./install.sh rift
```
