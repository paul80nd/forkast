A meal / shopping / rated list row. Wrap rows in a bordered `<ul>` with dividers.

```jsx
<ListRow image={r.image} title={r.title} onOpen={open}
  meta={<><span>{r.cuisine}</span><span>· ⏱ {r.prepTime} min</span></>}
  actions={<><Button variant="positive" size="sm" glyph="✓">Cooked</Button>
             <IconButton label="Remove" tone="danger">✕</IconButton></>} />
```
