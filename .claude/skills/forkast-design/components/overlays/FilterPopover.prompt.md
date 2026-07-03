A button that opens a popover of secondary controls, with an active-count badge —
the pattern for keeping a filter/search bar calm.

```jsx
<FilterPopover label="Filters" count={activeFilters.length}>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <Select value={cuisine} onChange={…}>…</Select>
    <Select value={maxTime} onChange={…}>…</Select>
    {activeFilters.length > 0 && <Button variant="ghost" size="sm" onClick={clearAll}>Clear all filters</Button>}
  </div>
</FilterPopover>
```

**How to use it well:** keep the *primary* controls (search, sort) inline on the
bar; tuck the rest (cuisine, time, rating) inside this; and render applied filters
as removable chips *below* the bar so the active state stays visible while the bar
stays quiet. Closes on outside-click and Escape. On mobile, treat the panel as a
bottom sheet.
