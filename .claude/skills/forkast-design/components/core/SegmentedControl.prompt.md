A bordered single-select toggle — the "Cooking for 2 / 4 / 6" portions control.

```jsx
<SegmentedControl ariaLabel="Portions" value={portions} onChange={setPortions}
  options={[{value:2},{value:4},{value:6}]} />
```

Active segment fills brand green. Use for 2–4 short, mutually exclusive choices.
