# experiment2

Independent preview of the optimized snowglobe experience.

- Prepare camera inference and hand graphics before interaction.
- Start camera rendering at pixel ratio 1 and reuse static shop shadows.
- Follow accepted hand samples smoothly with a bounded interpolation interval; no extrapolated gestures.
- Use pickup-relative movement and prioritize hand analysis while receiving snow.
- Preserve 12,000 snow particles with reduced repeated calculations.
- City field of view: 58 degrees.

Run `verification/check-*.mjs` with Node.js for regression checks.
`?trial=baseline` disables response trial options 1, 2, 3 and 7; it does not disable the later startup fixes.
Private working notes, camera recordings and local screenshots are excluded.
