# Quantum Superposition Collapse

Quantum mechanics wavefunction animation for niri window transitions.

## Preview

| Open | Close |
|------|-------|
| ![open](preview-open.webp) | ![close](preview-close.webp) |

## Concept

The window exists in quantum superposition -- multiple ghostly probability-amplitude copies that interfere according to the Born rule and collapse into a single classical outcome.

### Physics modeled

- **Wavefunction superposition**: The window is represented as a sum of momentum eigenstates psi_k(x,t) = e^(i(k*x - omega*t)), each carrying a different wave vector k. The open animation uses 6 copies; close uses 5.
- **Complex amplitude interference**: All amplitudes are complex-valued (vec2 in GLSL). The visible intensity is the Born rule probability density |sum(psi)|^2, producing real interference fringes from cross-terms between different momentum states.
- **Free particle dispersion**: Angular frequencies follow omega = |k|^2 / 2 (the free-particle dispersion relation in natural units), so different momentum components evolve at different rates, causing the wavepacket to spread over time.
- **Heisenberg uncertainty principle**: Position spread sigma_x and momentum spread sigma_p are kept reciprocal (sigma_x * sigma_p ~ constant). Early in the animation, position is uncertain (copies spread out, blurred) but momentum is well-defined (smooth drift). As the animation progresses, position sharpens but momentum becomes jittery.
- **Wavefunction collapse / decoherence**: A collapse wavefront propagates spatially. Inside the wavefront, the state is classical (single coherent window). Outside, quantum superposition persists. Random phase kicks simulate environment-induced decoherence, destroying interference between copies.
- **Quantum tunneling**: Faint ghost pixels appear beyond the window boundary, decaying exponentially with distance as e^(-kappa*x) -- the evanescent wave solution for a particle encountering a potential barrier. The decay constant kappa increases as the window solidifies.
- **Phase visualization**: The complex phase angle arg(psi_total) is mapped to a rainbow hue via HSV, producing an iridescent shimmer across the window surface. This is analogous to how phase is visualized in computational quantum mechanics.
- **Quantum vacuum fluctuations**: During the open animation's earliest moments, smooth noise simulates zero-point energy fluctuations from which the window materializes.

## Usage

Add the following to your `~/.config/niri/config.kdl` inside the `animations` block:

```kdl
animations {
    window-open {
        duration-ms 750
        curve "linear"
        custom-shader r"
            // paste contents of open.frag here
        "
    }

    window-close {
        duration-ms 650
        curve "linear"
        custom-shader r"
            // paste contents of close.frag here
        "
    }
}
```

Or use the install script from the repo root:

```sh
./install.sh quantum
```
