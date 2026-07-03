A styled native `<select>` (native menu, custom chrome + caret).

```jsx
<Select value={cuisine} onChange={e=>setCuisine(e.target.value)} aria-label="Cuisine">
  <option value="all">All cuisines</option>
  <option value="Italian">Italian</option>
</Select>
```

Used for the Browse / Curate filters. Keep option text sentence case.
