A transient confirmation pill with an optional action — reassurance after an
auto-advancing action (rate & move on, delete, etc).

```jsx
{toast && <Toast action="Undo" onAction={undo} onClose={() => setToast(null)}>
  Rated ★★★★ · Golden Chickpea Curry
</Toast>}
```

Render only while a message exists (host owns the state); it self-dismisses after
`duration`. Bottom-centre, inverts with the theme so it always contrasts.
