Forkast's signature card for the Browse grid.

```jsx
<RecipeCard recipe={r} stars={4} variantCount={3} onOpen={()=>go(r.id)} />
<RecipeCard recipe={r} selected={sel} onToggleSelect={toggle} />  {/* bulk-select mode */}
```

`recipe` needs { title, description, cuisine, prepTime, mainProtein?, image }.
Lifts on hover; ★ badge top-left, ⇄ versions badge bottom-left, select tickbox top-right.
