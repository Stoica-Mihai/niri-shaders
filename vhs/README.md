# VHS Tape

Analog VHS playback effect for niri window animations.

## Preview

| Open | Close |
|------|-------|
| ![open](preview-open.webp) | ![close](preview-close.webp) |

## Features

- Vertical tracking drift and horizontal tearing
- Chromatic aberration (RGB channel split)
- Scrolling tracking bands of noise
- Per-scanline horizontal wobble
- Color desaturation and warm VHS color push
- Static noise that resolves (open) or takes over (close)
- Scanlines

## Usage

Add to your `~/.config/niri/config.kdl`:

```kdl
animations {
    window-open {
        duration-ms 650
        curve "linear"
        custom-shader r"
            // paste contents of open.frag here
        "
    }

    window-close {
        duration-ms 550
        curve "linear"
        custom-shader r"
            // paste contents of close.frag here
        "
    }
}
```

Or use the install script:

```sh
./install.sh vhs
```
