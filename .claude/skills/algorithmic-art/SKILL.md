---
name: algorithmic-art
description: Creating algorithmic art using p5.js with seeded randomness and interactive parameter exploration. Use this when users request creating art using code, generative art, algorithmic art, flow fields, or particle systems. Create original algorithmic art rather than copying existing artists' work to avoid copyright violations.
license: Complete terms in LICENSE.txt
---

# Algorithmic Art Creation Framework

A workflow for generating computational art using p5.js with seeded randomness and interactive parameter exploration.

## Core Process

1. **Algorithmic Philosophy** — Develop a computational aesthetic manifesto (4-6 paragraphs) articulating the generative vision through mathematical relationships, noise patterns, particle behaviors, and emergent complexity.

2. **P5.js Implementation** — Express the philosophy as executable code within a self-contained HTML artifact that includes parameter controls, seed navigation, and real-time visual generation.

## Key Principles

- **Seeded Randomness**: Use `randomSeed()` and `noiseSeed()` for reproducible variation across seeds
- **Process Over Product**: Beauty emerges from algorithmic execution, not static composition
- **Parametric Design**: Parameters emerge naturally from the system's tunable properties — quantities, scales, probabilities, ratios, angles, thresholds
- **Craftsmanship**: Algorithms should appear meticulously crafted, representing master-level implementation

## Technical Foundation

Deploy as a single, self-contained HTML artifact embedding p5.js via CDN. Use `templates/viewer.html` as the structural foundation.

**Fixed elements**: Layout, sidebar, seed navigation, action buttons, typography (Poppins/Lora), color scheme, branding.

**Variable elements**: The p5.js algorithm, parameter definitions, color controls, visual output.

## Implementation

The artifact includes:
- Canvas display area
- Sidebar with seed controls (previous/next/random/jump)
- Parameter sliders for real-time adjustment
- Optional color picker
- Action buttons (regenerate, reset, download PNG)

The p5.js code handles `setup()`, `draw()`, and event listeners for parameter changes.
