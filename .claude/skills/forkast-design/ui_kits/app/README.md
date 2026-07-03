<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Forkast UI kit</title>
</head>
<body>
<h1>Forkast — UI kit</h1>
<p>An interactive, cosmetic recreation of the Forkast meal-planner in the Fresh
Organic direction. Not production logic — it demonstrates the design system on the
real screens.</p>

<h2>Files</h2>
<ul>
  <li><code>index.html</code> — the shell. Loads React 18 + Babel + <code>../../styles.css</code>, then transforms <code>app.jsx</code> with the classic JSX runtime and mounts it. This is the file previewed in the Design System tab.</li>
  <li><code>app.jsx</code> — the whole kit: token-driven primitives (Btn, IconBtn, Tag, Chip, Stars, Field, Sel, Check, Panel, RecipeCard, MealRow) and the five screens (Browse, Recipe, Curate, Plan, Shop) plus the app shell.</li>
  <li><code>data.js</code> — the six fictional demo recipes (mirrored from the app's <code>public/demo/recipes.json</code>), aisle order and rating labels.</li>
</ul>

<h2>Screens demonstrated</h2>
<ul>
  <li><strong>Browse</strong> — search / cuisine / sort filters, group-variants toggle, recipe-card grid. Click a card to open the recipe.</li>
  <li><strong>Recipe</strong> — image + at-a-glance facts + editable ★/◆ rating panel, ingredients (with parsed breakdown), method, Add-to-week.</li>
  <li><strong>Curate</strong> — one-card triage with the ★/◆ scales and household verdicts, plus the rated overview list.</li>
  <li><strong>Plan</strong> — portions control, "Suggest a varied week" (an info-toned proposal panel), the planned week, and an add-meals strip.</li>
  <li><strong>Shop</strong> — the plan's ingredients merged and grouped by aisle, tickable, with the store-cupboard basics kept separate.</li>
</ul>
<p>The header theme toggle switches the whole kit between light and dark, driven
entirely off the semantic <code>--fk-*</code> aliases.</p>

<h2>Note on rendering</h2>
<p>Because Babel-standalone defaults to the automatic JSX runtime (which emits an
ESM <code>import</code>), <code>index.html</code> transforms <code>app.jsx</code>
explicitly with <code>runtime: 'classic'</code>. Keep that if you copy this shell.</p>
</body>
</html>
