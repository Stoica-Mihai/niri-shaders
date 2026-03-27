# Jigsaw

Puzzle piece assembly/disassembly effect for niri window animations.

## Preview

| Open | Close |
|------|-------|
| ![open](preview-open.webp) | ![close](preview-close.webp) |

## Features

- Window split into a 4x3 grid of jigsaw pieces
- Semicircle tab/socket shapes on piece edges
- Each piece scatters from a random direction with staggered timing
- Pieces slide in and snap together on open
- Pieces disconnect and scatter on close
- Subtle piece outlines during animation

## Usage

Add to your `~/.config/niri/config.kdl`:

```kdl
animations {
    window-open {
        duration-ms 600
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
./install.sh jigsaw
```
