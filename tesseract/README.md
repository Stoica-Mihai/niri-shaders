# Tesseract (4D Hypercube Unfold)

Four-dimensional hypercube rotation effect for niri window animations.

## Preview

| Open | Close |
|------|-------|
| ![open](preview-open.webp) | ![close](preview-close.webp) |

## Concept

The window is rendered as one face of a tesseract -- the 4-dimensional analog of a cube. On close, the tesseract rotates through 4D space and the window face folds into a higher dimension until it vanishes. On open, the tesseract unfolds from 4D back into our 3D world, flattening into the window.

## 4D Geometry

A tesseract (also called a hypercube or 8-cell) is defined by 16 vertices at all combinations of (+/-1, +/-1, +/-1, +/-1) in 4D space. It has:

- **16 vertices** -- each a 4-component coordinate
- **32 edges** -- two vertices are connected if they differ in exactly one coordinate
- **24 square faces** -- grouped into 8 cubic cells
- **8 cubic cells** -- each a 3D cube living in a hyperplane of 4D space

The window texture is mapped onto the "front" face of the tesseract (the z=-1, w=-1 square). Other visible faces are rendered as translucent blue-tinted glass.

## 4D Rotation

Rotation in 4D operates on pairs of axes, just as 3D rotation operates on a plane (despite being commonly described by an axis). The shader composes rotations in four planes:

- **XW plane** -- the primary fold into the 4th dimension
- **YW plane** -- secondary 4D rotation for visual complexity
- **ZW plane** -- tertiary 4D tilt
- **XY plane** -- conventional rotation that adds dynamism

Each rotation is parameterized by the animation progress, creating a smooth sweep through 4D orientations.

## Double Projection

Since screens are 2D, the 4D geometry undergoes two perspective projections:

1. **4D to 3D** -- Perspective divide by the w-component relative to a 4D camera distance. Points further in the w-direction appear smaller, just as distant objects appear smaller in 3D.
2. **3D to 2D** -- Standard perspective divide by the z-component. This is the familiar camera projection.

The compound projection produces the characteristic nested-cube appearance of tesseract visualizations, where the "inner cube" is actually the far cell seen through 4D perspective.

## Rendering Pipeline

1. All 16 tesseract vertices are defined using a binary encoding scheme
2. 4D rotation matrices are applied based on animation progress
3. Double projection maps each vertex to 2D screen coordinates
4. All 32 edges are rendered as glowing line segments with distance-based falloff
5. The front face is identified and the window texture is mapped onto it via bilinear inverse
6. Additional faces render as translucent tinted glass with depth-based occlusion
7. Edge glow accumulates additively -- overlapping edges produce brighter intersections
8. Dimensional shimmer particles add texture to the wireframe

## Visual Details

- **Edge glow**: Cyan-to-blue gradient, intensity varies with projected depth
- **Depth sorting**: Faces further from the camera render behind closer ones
- **Glass faces**: Non-window faces appear as translucent blue panels
- **Blue tint**: Window content shifts toward blue as it enters 4D space
- **Sparkle noise**: Hash-based particles shimmer along edges during transition

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
./install.sh tesseract
```
