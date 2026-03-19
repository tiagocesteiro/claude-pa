---
name: slack-gif-creator
description: Knowledge and utilities for creating animated GIFs optimized for Slack. Provides constraints, validation tools, and animation concepts. Use when users request animated GIFs for Slack like "make me a GIF of X doing Y for Slack."
license: Complete terms in LICENSE.txt
---

# Slack GIF Creator

A toolkit for creating animated GIFs optimized for Slack.

## Slack Requirements

**Dimensions:**
- Emoji GIFs: 128x128 (recommended)
- Message GIFs: 480x480

**Parameters:**
- FPS: 10-30 (lower = smaller file)
- Colors: 48-128 (fewer = smaller file)
- Duration: under 3 seconds for emoji GIFs

## Core Workflow

```python
from core.gif_builder import GIFBuilder
from PIL import Image, ImageDraw

builder = GIFBuilder(width=128, height=128, fps=10)

for i in range(12):
    frame = Image.new('RGB', (128, 128), (240, 248, 255))
    draw = ImageDraw.Draw(frame)
    # Draw animation using PIL primitives
    builder.add_frame(frame)

builder.save('output.gif', num_colors=48, optimize_for_emoji=True)
```

## Drawing Graphics

Use PIL ImageDraw primitives:

```python
draw.ellipse([x1, y1, x2, y2], fill=(r, g, b), outline=(r, g, b), width=3)
draw.polygon(points, fill=(r, g, b), outline=(r, g, b), width=3)
draw.line([(x1, y1), (x2, y2)], fill=(r, g, b), width=5)
draw.rectangle([x1, y1, x2, y2], fill=(r, g, b), outline=(r, g, b), width=3)
```

**Making graphics look good:**
- Use `width=2` or higher for outlines — thin lines look choppy
- Add visual depth with gradients (`create_gradient_background`)
- Layer shapes for complexity
- Use vibrant, complementary colors with contrast

## Animation Concepts

| Concept | Technique |
|---------|-----------|
| Shake | `math.sin()` offset on position |
| Pulse | `math.sin(t * freq * 2 * pi)` for scale |
| Bounce | `easing='bounce_out'` on landing |
| Spin | `image.rotate(angle, resample=Image.BICUBIC)` |
| Fade | Adjust alpha channel |
| Slide | `easing='ease_out'` for smooth stop |
| Particles | Random angles + velocities + gravity |

## Available Utilities

- `core.gif_builder` — assemble frames, optimize
- `core.validators` — check Slack requirements
- `core.easing` — smooth motion (ease_in, ease_out, bounce_out, elastic_out, etc.)
- `core.frame_composer` — blank frames, gradients, helpers

## Optimization

```python
builder.save('emoji.gif', num_colors=48, optimize_for_emoji=True, remove_duplicates=True)
```

## Dependencies

```bash
pip install pillow imageio numpy
```
