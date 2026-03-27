# Black Hole

Gravitational singularity effect for niri window animations.

## Preview

| Open | Close |
|------|-------|
| ![open](preview-open.webp) | ![close](preview-close.webp) |

## Features

- Gravitational lensing warps pixels toward/away from center
- Spaghettification stretches content into the singularity
- Growing/shrinking event horizon (black circle)
- Accretion disk glow (orange/white ring)
- Swirl rotation that intensifies near the center (close)
- Gravitational blueshift near the horizon
- Space distortion ripples (open)

## Usage

Add the following to your `~/.config/niri/config.kdl` inside the `animations` block:

```kdl
animations {
    window-open {
        duration-ms 600
        curve "ease-out-expo"
        custom-shader r"
            // paste contents of open.frag here
        "
    }

    window-close {
        duration-ms 700
        curve "ease-out-cubic"
        custom-shader r"
            // paste contents of close.frag here
        "
    }
}
```

Or use the install script from the repo root:

```sh
./install.sh blackhole
```
