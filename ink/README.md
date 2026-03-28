# Curl Noise Ink Dissolution

Window dissolves into swirling ink tendrils in water using physically-based incompressible fluid dynamics for niri window animations.

## Preview

| Open | Close |
|------|-------|
| ![open](preview-open.webp) | ![close](preview-close.webp) |

## Features

- **Curl noise for divergence-free velocity fields** -- Computes the curl of a 3D scalar potential field to produce 2D velocities that are inherently divergence-free, approximating incompressible fluid flow. The velocity is derived as (dPsi/dy, -dPsi/dx) via finite differences on a multi-octave 3D noise potential.
- **Multi-octave curl turbulence** -- Four octaves of curl noise layered with decreasing amplitude and increasing frequency produce rich, detailed turbulent motion at multiple spatial scales.
- **Backward advection with midpoint integration** -- Texture coordinates are displaced along the velocity field using two-step midpoint (modified Euler) integration for smoother, more accurate particle tracing than single-step Euler.
- **Ink tendril formation** -- The dissolve boundary uses multi-frequency noise thresholding aligned with the curl flow direction to create organic, reaching tendrils that follow the fluid motion.
- **Color bleeding** -- At dissolve boundaries, nearby pixels are sampled along the flow direction and blended to simulate ink colors mixing and diffusing in water.
- **Concentrated vortex structures** -- Seed-randomized vortex centers with exponentially decaying tangential velocity fields enhance the natural curl noise vortices, creating visible spinning ink pools.
- **Luminance-based buoyancy** -- Brighter regions drift upward faster, mimicking the physical behavior of lighter ink particles rising in a fluid medium.
- **Boundary diffusion** -- A Gaussian blur kernel softens sharp edges at the dissolve front, simulating the natural diffusion of ink boundaries in water over time.
- **Indigo ink tint** -- Dissolve edges shift toward indigo/dark blue, evoking the look of ink bleeding into water.

## Usage

Add to your `~/.config/niri/config.kdl`:

```kdl
animations {
    window-open {
        duration-ms 700
        curve "linear"
        custom-shader r"
            // paste contents of open.frag here
        "
    }

    window-close {
        duration-ms 600
        curve "linear"
        custom-shader r"
            // paste contents of close.frag here
        "
    }
}
```

Or use the install script:

```sh
./install.sh ink
```
