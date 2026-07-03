The primary action button (and a fused split button for "action + menu").

```jsx
<Button variant="primary" glyph="+">Add to week</Button>
<Button variant="positive" glyph="✓">In week</Button>
<Button variant="ghost" size="sm">Skip →</Button>
<SplitButton glyph="+" onMain={add} open={open} onToggle={()=>setOpen(o=>!o)}
  menu={<button role="menuitem">Delete recipe</button>}>Add to week</SplitButton>
```

Variants: **primary** (brand fill — the one main action per view), **positive**
(green tint — confirmed states like "In week"), **soft** (brand tint, secondary),
**danger** (rose — destructive), **ghost** (text-only, for Back/Skip/Clear),
**outline**. Sizes sm/md/lg. Keep to one primary per view.
