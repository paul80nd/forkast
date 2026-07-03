A tappable list line that checks off — recipe ingredients (mise en place), method
steps, and shopping ticks. Wrap in a plain `<ul>`.

```jsx
<CheckItem checked={done} onToggle={toggle}>300 g orzo</CheckItem>
<CheckItem marker="step" index={1} checked={done} onToggle={toggle}>Roast the tomatoes…</CheckItem>
```

Checked lines strike through and mute. Pair with a serving-scaler (a SegmentedControl)
so quantities recompute as the count changes.
