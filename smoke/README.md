# Smoke Rise

Window evaporates into smoke for niri window animations.

## Features

- Turbulent noise-based pixel displacement
- Content drifts upward like rising smoke
- Irregular dissolve edge with wispy smoke wisps
- Desaturation near the smoke boundary
- Fractal Brownian motion for organic turbulence

## Usage

Add to your `~/.config/niri/config.kdl`:

```kdl
animations {
    window-open {
        duration-ms 500
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
./install.sh smoke
```
