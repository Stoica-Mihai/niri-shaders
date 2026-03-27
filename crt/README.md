# CRT

Classic CRT monitor power-on/power-off effect for niri window animations.

## Preview

| Open | Close |
|------|-------|
| ![open](preview-open.webp) | ![close](preview-close.webp) |

## Features

- Bright center dot that lingers before the image expands
- Horizontal jitter and per-scanline wobble
- Scanlines and vertical RGB sub-pixel columns
- Static noise
- Barrel distortion (screen curvature)
- Phosphor green tint

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
        duration-ms 800
        curve "linear"
        custom-shader r"
            // paste contents of close.frag here
        "
    }
}
```

Or use the install script from the repo root:

```sh
./install.sh crt
```
