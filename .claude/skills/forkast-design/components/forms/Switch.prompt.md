An on/off toggle switch — for a setting that takes effect immediately and reads as
persistent state.

```jsx
<Switch checked={groupVariants} onChange={setGroupVariants} label="Group variants" />
```

**Switch vs Checkbox** — pick by meaning, not looks:
- **Switch** — an immediate-effect, persistent on/off (Browse's "Group variants",
  "Include unrated"). The track fills brand green when on.
- **Checkbox** — a selection within a form, or an item in a multi-select list you
  tick through (the Shop tick-list, bulk-select on Browse cards). Use `Checkbox`.
