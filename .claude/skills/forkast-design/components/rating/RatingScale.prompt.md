Forkast's signature 1–5 rating control. Two presets: **StarRating** (quality, honey
★) and **RotationRating** (how-often, harbour ◆). Interactive when `onChange` is
passed; read-only otherwise.

```jsx
<StarRating size="lg" showLabel value={stars} onChange={setStars} />
<RotationRating value={rotation} onChange={setRotation} />
<StarRating size="sm" value={4} />           {/* read-only display */}
```

Sizes sm (row) / md / lg (triage & detail). Re-clicking the current value clears it
(back to triage). Star fill = --fk-star; rotation fill = --fk-info.
