# Polaroid

Instant film photo development effect for niri window animations.

## Preview

| Open | Close |
|------|-------|
| ![open](preview-open.webp) | ![close](preview-close.webp) |

## Features

- Window develops from overexposed white like a polaroid photo
- Sepia tones emerge first, then full color
- Contrast builds gradually from flat to full range
- Chemical development noise for organic unevenness
- Warm color cast typical of instant film
- Subtle vignette and film grain
- Close reverses: color drains, bleaches back to white

## Usage

Add to your `~/.config/niri/config.kdl`:

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
        duration-ms 450
        curve "linear"
        custom-shader r"
            // paste contents of close.frag here
        "
    }
}
```

Or use the install script:

```sh
./install.sh polaroid
```
