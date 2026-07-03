/* ============================================================================
   Forkast — interactive UI-kit recreation (Fresh Organic direction).
   A cosmetic, click-through rebuild of the real app's screens: Browse, Recipe,
   Plan, Shop, Curate — composed from token-driven primitives. Not production
   logic; it demonstrates the visual system in motion. Mounts into #root.
   ============================================================================ */
const { useState, useMemo } = React
const RECIPES = window.FK_RECIPES
const STAR_LABELS = window.FK_STAR_LABELS
const ROTATION_LABELS = window.FK_ROTATION_LABELS

/* ------------------------------------------------------------------ helpers */
const byId = Object.fromEntries(RECIPES.map((r) => [r.id, r]))

/* ============================================================= primitives == */
function Btn({ children, variant = 'primary', size = 'md', glyph, disabled, onClick, style }) {
  const [h, setH] = useState(false)
  const V = {
    primary:  { bg: 'var(--fk-brand)', fg: '#fff', hv: 'var(--fk-brand-hover)', bd: 'transparent' },
    positive: { bg: 'var(--fk-positive-tint)', fg: 'var(--fk-positive-ink)', hv: 'var(--fk-green-200)', bd: 'transparent' },
    soft:     { bg: 'var(--fk-brand-tint)', fg: 'var(--fk-brand-ink)', hv: 'var(--fk-green-200)', bd: 'transparent' },
    danger:   { bg: 'var(--fk-danger)', fg: '#fff', hv: 'var(--fk-danger-hover)', bd: 'transparent' },
    ghost:    { bg: 'transparent', fg: 'var(--fk-text-muted)', hv: 'var(--fk-surface-sunken)', bd: 'transparent' },
    info:     { bg: 'var(--fk-info)', fg: '#fff', hv: 'var(--fk-harbour-700)', bd: 'transparent' },
    infosoft: { bg: 'var(--fk-info-tint)', fg: 'var(--fk-info-ink)', hv: 'var(--fk-harbour-200)', bd: 'transparent' },
    outline:  { bg: 'var(--fk-surface-card)', fg: 'var(--fk-text)', hv: 'var(--fk-surface-sunken)', bd: 'var(--fk-border-strong)' },
  }[variant]
  const S = size === 'sm' ? { padding: '5px 11px', fontSize: 'var(--fk-text-sm)' } : { padding: '7px 15px', fontSize: 'var(--fk-text-body)' }
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        fontFamily: 'var(--fk-font-body)', fontWeight: 500, lineHeight: 1.1, ...S,
        color: V.fg, background: disabled ? V.bg : h ? V.hv : V.bg, border: '1px solid ' + V.bd,
        borderRadius: 'var(--fk-radius-md)', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
        transition: 'background var(--fk-duration) var(--fk-ease)', ...style }}>
      {glyph && <span aria-hidden>{glyph}</span>}{children}
    </button>
  )
}
function IconBtn({ children, tone = 'neutral', label, onClick, size = 34 }) {
  const [h, setH] = useState(false)
  const T = {
    neutral: { fg: 'var(--fk-text-muted)', hf: 'var(--fk-text)', hb: 'var(--fk-surface-sunken)' },
    danger:  { fg: 'var(--fk-text-muted)', hf: 'var(--fk-danger-ink)', hb: 'var(--fk-danger-wash)' },
  }[tone]
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--fk-font-body)', fontSize: Math.round(size * 0.5), color: h ? T.hf : T.fg,
        background: h ? T.hb : 'transparent', border: 'none', borderRadius: 'var(--fk-radius-md)', cursor: 'pointer',
        transition: 'background var(--fk-duration) var(--fk-ease)' }}>{children}</button>
  )
}
const TAG_TONES = {
  neutral: ['var(--fk-surface-sunken)', 'var(--fk-text-muted)'], brand: ['var(--fk-brand-tint)', 'var(--fk-brand-ink)'],
  star: ['var(--fk-star-tint)', 'var(--fk-star-ink)'], info: ['var(--fk-info-tint)', 'var(--fk-info-ink)'],
  warn: ['var(--fk-warn-tint)', 'var(--fk-warn-ink)'],
}
function Tag({ children, tone = 'neutral', square, style }) {
  const [bg, fg] = TAG_TONES[tone]
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--fk-font-body)',
    fontSize: 'var(--fk-text-xs)', fontWeight: 500, lineHeight: 1.4, padding: '3px 9px', color: fg, background: bg,
    borderRadius: square ? 'var(--fk-radius-sm)' : 'var(--fk-radius-full)', whiteSpace: 'nowrap', ...style }}>{children}</span>
}
function Chip({ children, selected, onClick }) {
  const [h, setH] = useState(false)
  return <button type="button" onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-sm)', fontWeight: 500, padding: '6px 14px',
      borderRadius: 'var(--fk-radius-full)', cursor: 'pointer', color: selected ? '#fff' : 'var(--fk-text-muted)',
      background: selected ? 'var(--fk-brand)' : 'var(--fk-surface-card)',
      border: '1px solid ' + (selected ? 'var(--fk-brand)' : h ? 'var(--fk-green-300)' : 'var(--fk-border-strong)'),
      transition: 'all var(--fk-duration) var(--fk-ease)' }}>{children}</button>
}
function Stars({ value, onChange, glyph = '★', color = 'var(--fk-star)', size = 'md', labels, showLabel }) {
  const [hov, setHov] = useState(null)
  const px = { sm: 16, md: 20, lg: 30 }[size]
  const shown = hov ?? value ?? 0
  const lf = hov ?? value
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ display: 'inline-flex', gap: '2px' }} onMouseLeave={() => setHov(null)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const common = { fontSize: px, lineHeight: 1, color: n <= shown ? color : 'var(--fk-neutral-300)' }
          if (!onChange) return <span key={n} style={common}>{glyph}</span>
          return <button key={n} type="button" onMouseEnter={() => setHov(n)} onClick={() => onChange(value === n ? undefined : n)}
            title={labels ? n + ' — ' + labels[n] : n} style={{ ...common, background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', transform: hov === n ? 'scale(1.12)' : 'none', transition: 'transform var(--fk-duration) var(--fk-ease)' }}>{glyph}</button>
        })}
      </span>
      {showLabel && <span style={{ fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}>{lf && labels ? labels[lf] : ''}</span>}
    </span>
  )
}
const inputStyle = (focus) => ({ fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text)',
  background: 'var(--fk-surface-card)', padding: '7px 11px', borderRadius: 'var(--fk-radius-md)',
  border: '1px solid ' + (focus ? 'var(--fk-brand)' : 'var(--fk-border-strong)'), boxShadow: focus ? 'var(--fk-shadow-focus)' : 'none',
  outline: 'none', transition: 'all var(--fk-duration) var(--fk-ease)' })
function Field(props) {
  const [f, setF] = useState(false)
  return <input {...props} onFocus={() => setF(true)} onBlur={() => setF(false)} style={{ ...inputStyle(f), ...props.style }} />
}
function Sel({ value, onChange, children, style }) {
  const [f, setF] = useState(false)
  return <span style={{ position: 'relative', display: 'inline-block' }}>
    <select value={value} onChange={onChange} onFocus={() => setF(true)} onBlur={() => setF(false)}
      style={{ appearance: 'none', WebkitAppearance: 'none', ...inputStyle(f), padding: '7px 30px 7px 11px', cursor: 'pointer', ...style }}>{children}</select>
    <span aria-hidden style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--fk-text-muted)', fontSize: '11px' }}>▾</span>
  </span>
}
function Check({ checked, onChange, label }) {
  return <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--fk-font-body)',
    fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--fk-brand)' }} />{label}</label>
}
const PANEL_TONES = {
  info: ['var(--fk-info-wash)', 'var(--fk-harbour-200)', 'var(--fk-harbour-900)'],
  brand: ['var(--fk-brand-wash)', 'var(--fk-green-200)', 'var(--fk-brand-ink)'],
  neutral: ['var(--fk-surface-card)', 'var(--fk-border)', 'var(--fk-text)'],
}
function Panel({ children, tone = 'neutral', style }) {
  const [bg, bd] = PANEL_TONES[tone]
  return <section style={{ background: bg, border: '1px solid ' + bd, borderRadius: 'var(--fk-radius-2xl)', padding: '16px', ...style }}>{children}</section>
}
function Eyebrow({ children, color = 'var(--fk-text-muted)' }) {
  return <div style={{ fontSize: 'var(--fk-text-2xs)', letterSpacing: 'var(--fk-tracking-caps)', textTransform: 'uppercase', fontWeight: 600, color }}>{children}</div>
}
function H1({ children }) {
  return <h1 style={{ margin: 0, fontFamily: 'var(--fk-font-display)', fontWeight: 600, fontSize: 'var(--fk-text-h1)', letterSpacing: 'var(--fk-tracking-tight)', color: 'var(--fk-text)' }}>{children}</h1>
}

/* ============================================================ RecipeCard === */
function RecipeCard({ r, stars, onOpen }) {
  const [h, setH] = useState(false)
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onOpen}
      style={{ cursor: 'pointer', overflow: 'hidden', background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)',
        borderRadius: 'var(--fk-radius-lg)', boxShadow: h ? 'var(--fk-shadow-md)' : 'var(--fk-shadow-sm)',
        transform: h ? 'translateY(var(--fk-lift))' : 'none', transition: 'transform var(--fk-duration) var(--fk-ease), box-shadow var(--fk-duration) var(--fk-ease)' }}>
      <div style={{ position: 'relative' }}>
        <img src={r.image} alt="" style={{ aspectRatio: '4 / 3', width: '100%', objectFit: 'cover', display: 'block' }} />
        {stars != null && <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,.92)', color: 'var(--fk-star-ink)', fontSize: 'var(--fk-text-xs)', fontWeight: 600, padding: '2px 8px', borderRadius: 999, boxShadow: 'var(--fk-shadow-xs)' }}>{'★'.repeat(stars)}</span>}
      </div>
      <div style={{ padding: 12 }}>
        <Tag>{r.cuisine}</Tag>
        <h3 style={{ margin: '8px 0 0', fontFamily: 'var(--fk-font-display)', fontWeight: 600, fontSize: 'var(--fk-text-h3)', lineHeight: 'var(--fk-leading-snug)', color: 'var(--fk-text)' }}>{r.title}</h3>
        <p style={{ margin: '4px 0 0', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)', lineHeight: 'var(--fk-leading-snug)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</p>
        <div style={{ marginTop: 8, fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)' }}>⏱ {r.prepTime} min <span style={{ textTransform: 'capitalize' }}>· {r.mainProtein}</span></div>
      </div>
    </div>
  )
}

/* ================================================================ Browse === */
function Browse({ ratings, onOpen }) {
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState('all')
  const [sort, setSort] = useState('rating')
  const [group, setGroup] = useState(true)
  const cuisines = [...new Set(RECIPES.map((r) => r.cuisine))].sort()
  const list = useMemo(() => {
    let l = RECIPES.slice()
    const q = query.trim().toLowerCase()
    if (q) l = l.filter((r) => r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.includes(q)))
    if (cuisine !== 'all') l = l.filter((r) => r.cuisine === cuisine)
    l.sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'time' ? a.prepTime - b.prepTime
      : (ratings[b.id]?.stars ?? 0) - (ratings[a.id]?.stars ?? 0))
    return l
  }, [query, cuisine, sort, ratings])
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <H1>Browse</H1>
        <span style={{ fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}>{list.length} dishes of {RECIPES.length}</span>
      </div>
      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Field type="search" value={query} placeholder="Search title or ingredient…" onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        <Sel value={cuisine} onChange={(e) => setCuisine(e.target.value)}><option value="all">All cuisines</option>{cuisines.map((c) => <option key={c}>{c}</option>)}</Sel>
        <Sel value={sort} onChange={(e) => setSort(e.target.value)}><option value="rating">Top rated (your ★)</option><option value="time">Quickest</option><option value="name">A–Z</option></Sel>
        <Check checked={group} onChange={setGroup} label="Group variants" />
      </div>
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
        {list.map((r) => <RecipeCard key={r.id} r={r} stars={ratings[r.id]?.stars} onOpen={() => onOpen(r.id)} />)}
      </div>
    </div>
  )
}

/* ================================================================ Recipe === */
function Recipe({ r, ratings, setRating, inPlan, togglePlan, onBack }) {
  const rt = ratings[r.id] || {}
  return (
    <div>
      <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-brand-ink)' }}>← Back to Browse</button>
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) 3fr', gap: 24 }}>
        {/* left */}
        <div>
          <img src={r.image} alt="" style={{ aspectRatio: '4 / 3', width: '100%', borderRadius: 'var(--fk-radius-xl)', objectFit: 'cover' }} />
          <dl style={{ margin: '16px 0 0', fontSize: 'var(--fk-text-sm)' }}>
            {[['Cuisine', r.cuisine], ['Time', r.prepTime + ' min'], ['Main', r.mainProtein], ['Serves', r.serves]].map(([k, v]) =>
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--fk-divider)' }}>
                <dt style={{ color: 'var(--fk-text-muted)' }}>{k}</dt><dd style={{ margin: 0, fontWeight: 500, textTransform: k === 'Main' ? 'capitalize' : 'none' }}>{v}</dd></div>)}
          </dl>
          <div style={{ marginTop: 16, background: 'var(--fk-surface-sunken)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-lg)', padding: 14 }}>
            <Eyebrow>Your rating</Eyebrow>
            <div style={{ marginTop: 8 }}><Stars value={rt.stars} onChange={(v) => setRating(r.id, 'stars', v)} labels={STAR_LABELS} size="lg" showLabel /></div>
            {rt.stars >= 3 && <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)' }}>How often</span>
              <Stars value={rt.rotation} onChange={(v) => setRating(r.id, 'rotation', v)} glyph="◆" color="var(--fk-info)" labels={ROTATION_LABELS} showLabel /></div>}
          </div>
          {r.allergens.length > 0 && <div style={{ marginTop: 16 }}><Eyebrow>Allergens</Eyebrow>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{r.allergens.map((a) => <Tag key={a} square>{a}</Tag>)}</div></div>}
        </div>
        {/* right */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--fk-font-display)', fontWeight: 600, fontSize: 'var(--fk-text-h1)', letterSpacing: 'var(--fk-tracking-tight)' }}>{r.title}</h1>
            {inPlan ? <Btn variant="positive" glyph="✓" onClick={() => togglePlan(r.id)}>In week</Btn> : <Btn variant="primary" glyph="+" onClick={() => togglePlan(r.id)}>Add to week</Btn>}
          </div>
          <p style={{ marginTop: 8, color: 'var(--fk-text-muted)', fontSize: 'var(--fk-text-body)', lineHeight: 'var(--fk-leading-normal)' }}>{r.description}</p>
          <div style={{ marginTop: 20 }}><Eyebrow>Ingredients</Eyebrow>
            <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
              {r.ingredients.map((i, k) => <li key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--fk-divider)' }}>
                <span style={{ color: 'var(--fk-text)' }}>{i.rawLabel}</span>
                <span style={{ fontFamily: 'var(--fk-font-mono)', fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)' }}>{i.qty ?? '—'}{i.unit ? ' ' + i.unit : ''} · {i.name}</span></li>)}
            </ul>
            <p style={{ marginTop: 10, fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}><b style={{ color: 'var(--fk-text)' }}>Store cupboard:</b> {r.basics.join(', ')}</p>
          </div>
          <div style={{ marginTop: 20 }}><Eyebrow>Method</Eyebrow>
            <ol style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {r.instructions.map((s, k) => <li key={k} style={{ display: 'flex', gap: 12 }}>
                <span style={{ flex: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: 'var(--fk-brand-tint)', color: 'var(--fk-brand-ink)', fontSize: 'var(--fk-text-sm)', fontWeight: 600 }}>{k + 1}</span>
                <span style={{ color: 'var(--fk-text)', lineHeight: 'var(--fk-leading-normal)' }}>{s}</span></li>)}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== Plan === */
function MealRow({ r, onOpen, right }) {
  return <li style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', listStyle: 'none' }}>
    <div style={{ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', gap: 12 }}>
      <img src={r.image} alt="" style={{ width: 56, height: 56, borderRadius: 'var(--fk-radius-md)', objectFit: 'cover', flex: 'none' }} />
      <div style={{ minWidth: 0 }}>
        <button type="button" onClick={onOpen} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--fk-font-body)', fontWeight: 500, fontSize: 'var(--fk-text-body)', color: 'var(--fk-text)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', textAlign: 'left' }}>{r.title}</button>
        <div style={{ marginTop: 2, fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)' }}>{r.cuisine} · <span style={{ textTransform: 'capitalize' }}>{r.mainProtein}</span> · ⏱ {r.prepTime} min</div>
      </div>
    </div>
    {right}
  </li>
}
function Plan({ ratings, planIds, togglePlan, portions, setPortions, onOpen }) {
  const [shortlist, setShortlist] = useState([])
  const planned = planIds.map((id) => byId[id])
  const suggest = () => {
    const pool = RECIPES.filter((r) => !planIds.includes(r.id) && r.mainProtein !== 'fish')
    setShortlist(pool.slice(0, 4).map((r) => r.id))
  }
  const accept = () => { shortlist.forEach((id) => { if (!planIds.includes(id)) togglePlan(id) }); setShortlist([]) }
  const cuisineTally = {}
  planned.forEach((r) => { cuisineTally[r.cuisine] = (cuisineTally[r.cuisine] || 0) + 1 })
  const candidates = RECIPES.filter((r) => (ratings[r.id]?.stars ?? 0) >= 3 && !planIds.includes(r.id) && r.mainProtein !== 'fish')
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <H1>Plan</H1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fk-text-sm)' }}>
          <span style={{ color: 'var(--fk-text-muted)' }}>Cooking for</span>
          <span style={{ display: 'inline-flex', border: '1px solid var(--fk-border-strong)', borderRadius: 'var(--fk-radius-md)', overflow: 'hidden' }}>
            {[2, 4, 6].map((n, i) => <button key={n} type="button" onClick={() => setPortions(n)} style={{ fontFamily: 'var(--fk-font-body)', fontWeight: 500, fontSize: 'var(--fk-text-sm)', padding: '5px 14px', border: 'none', borderLeft: i ? '1px solid var(--fk-border)' : 'none', background: portions === n ? 'var(--fk-brand)' : 'var(--fk-surface-card)', color: portions === n ? '#fff' : 'var(--fk-text-muted)', cursor: 'pointer' }}>{n}</button>)}
          </span>
        </div>
      </div>
      <div style={{ marginTop: 16 }}><Btn variant="primary" onClick={suggest}>Suggest a varied week</Btn></div>

      {shortlist.length > 0 && <div style={{ marginTop: 16 }}><Panel tone="info">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div><div style={{ fontFamily: 'var(--fk-font-display)', fontWeight: 600, fontSize: 'var(--fk-text-h2)', color: 'var(--fk-harbour-900)' }}>Suggested week</div>
            <div style={{ fontSize: 'var(--fk-text-xs)', color: 'var(--fk-info-ink)' }}>A proposal — reroll, lock, or swap any, then accept. Nothing's added yet.</div></div>
          <div style={{ display: 'flex', gap: 6 }}><Btn variant="info" size="sm" onClick={accept}>Accept {shortlist.length} → week</Btn><Btn variant="infosoft" size="sm" onClick={suggest}>Re-suggest</Btn><Btn variant="ghost" size="sm" onClick={() => setShortlist([])}>Clear</Btn></div>
        </div>
        <ul style={{ margin: '12px 0 0', padding: 0 }}>
          {shortlist.map((id) => { const r = byId[id]; return <li key={id} style={{ background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-lg)', marginBottom: 8, listStyle: 'none' }}>
            <MealRow r={r} onOpen={() => onOpen(id)} right={<div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingRight: 6 }}>
              {ratings[id]?.stars == null && <Tag tone="warn">unrated</Tag>}<Tag tone="info">variety</Tag>
              <IconBtn label="Reroll">↻</IconBtn></div>} /></li> })}
        </ul>
      </Panel></div>}

      {planned.length === 0 ? <div style={{ marginTop: 16 }}><div style={{ background: 'var(--fk-surface-card)', border: '1px dashed var(--fk-border-strong)', borderRadius: 'var(--fk-radius-2xl)', padding: '40px 24px', textAlign: 'center', color: 'var(--fk-text-muted)' }}>Nothing planned yet — suggest a week, or add meals below.</div></div> : <>
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-lg)', padding: 12 }}>
          <Eyebrow>Cuisines</Eyebrow>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{Object.entries(cuisineTally).map(([c, n]) => <Tag key={c} tone={n > 1 ? 'warn' : 'neutral'}>{c}{n > 1 ? ' ×' + n : ''}</Tag>)}</div>
        </div>
        <ul style={{ margin: '16px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {planned.map((r) => <li key={r.id} style={{ background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-lg)', listStyle: 'none' }}>
            <MealRow r={r} onOpen={() => onOpen(r.id)} right={<div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingRight: 6 }}>
              <Btn variant="positive" size="sm" glyph="✓" onClick={() => togglePlan(r.id)}>Cooked</Btn>
              <IconBtn label="Remove from week" tone="danger" onClick={() => togglePlan(r.id)}>✕</IconBtn></div>} /></li>)}
        </ul>
      </>}

      <div style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><h2 style={{ margin: 0, fontFamily: 'var(--fk-font-display)', fontWeight: 600, fontSize: 'var(--fk-text-h2)' }}>Add meals</h2><span style={{ fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}>· your favourites</span></div>
        <div style={{ marginTop: 12, display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {candidates.map((r) => <button key={r.id} type="button" onClick={() => togglePlan(r.id)} style={{ width: 160, flex: 'none', textAlign: 'left', background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-lg)', overflow: 'hidden', boxShadow: 'var(--fk-shadow-sm)', cursor: 'pointer', padding: 0 }}>
            <img src={r.image} alt="" style={{ aspectRatio: '4 / 3', width: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ padding: 8 }}><div style={{ fontSize: 'var(--fk-text-sm)', fontWeight: 500, color: 'var(--fk-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
              <div style={{ fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)', marginTop: 2 }}>{r.cuisine} · {r.mainProtein}</div></div></button>)}
          {candidates.length === 0 && <p style={{ fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}>No more shortlisted recipes to add.</p>}
        </div>
      </div>
    </div>
  )
}

/* ================================================================== Shop === */
function Shop({ planIds, portions, ticks, toggleTick, onGoPlan }) {
  const planned = planIds.map((id) => byId[id])
  const scale = portions / 2
  const aisles = useMemo(() => {
    const map = {}
    planned.forEach((r) => r.ingredients.forEach((i) => {
      const key = i.name + '|' + (i.unit || '')
      if (!map[i.aisle]) map[i.aisle] = {}
      if (!map[i.aisle][key]) map[i.aisle][key] = { name: i.name, unit: i.unit, qty: 0, from: 0 }
      map[i.aisle][key].qty += (i.qty || 0) * scale; map[i.aisle][key].from += 1
    }))
    return window.FK_AISLE_ORDER.filter((a) => map[a]).map((a) => ({ aisle: a, lines: Object.entries(map[a]).map(([k, v]) => ({ key: a + '|' + k, ...v })) }))
  }, [planIds, portions])
  const basics = [...new Set(planned.flatMap((r) => r.basics))].sort()
  const itemCount = aisles.reduce((n, g) => n + g.lines.length, 0)

  if (planned.length === 0) return <div><H1>Shop</H1>
    <div style={{ marginTop: 16, background: 'var(--fk-surface-card)', border: '1px dashed var(--fk-border-strong)', borderRadius: 'var(--fk-radius-2xl)', padding: '40px 24px', textAlign: 'center', color: 'var(--fk-text-muted)' }}>No meals planned, so nothing to buy. <button type="button" onClick={onGoPlan} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--fk-brand-ink)', fontFamily: 'inherit', fontSize: 'inherit' }}>Plan a week →</button></div></div>

  const Row = ({ line, muted }) => { const on = ticks[line.key]; return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', listStyle: 'none' }}>
      <label style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!on} onChange={() => toggleTick(line.key)} style={{ width: 16, height: 16, accentColor: 'var(--fk-brand)' }} />
        <span>
          <span style={{ display: 'block', textDecoration: on ? 'line-through' : 'none', color: on ? 'var(--fk-text-muted)' : muted ? 'var(--fk-text-muted)' : 'var(--fk-text)' }}>
            {line.qty ? Math.round(line.qty) + (line.unit ? ' ' + line.unit : '') + ' ' : ''}{line.name}</span>
          {line.from > 1 && <span style={{ display: 'block', fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-subtle)' }}>from {line.from} recipes</span>}
        </span>
      </label>
    </li>) }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <H1>Shop</H1><span style={{ fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}>{itemCount} items · {planned.length} meals · for {portions}</span>
      </div>
      <div style={{ marginTop: 16, columnGap: 24, columns: itemCount > 6 ? 2 : 1 }}>
        {aisles.map((g) => <div key={g.aisle} style={{ breakInside: 'avoid', marginBottom: 20 }}>
          <Eyebrow>{g.aisle}</Eyebrow>
          <ul style={{ margin: '8px 0 0', padding: 0, background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-lg)' }}>
            {g.lines.map((l, i) => <React.Fragment key={l.key}>{i > 0 && <div style={{ height: 1, background: 'var(--fk-divider)' }} />}<Row line={l} /></React.Fragment>)}
          </ul>
        </div>)}
      </div>
      <div style={{ marginTop: 4 }}><Eyebrow>Store cupboard · assumed in</Eyebrow>
        <ul style={{ margin: '8px 0 0', padding: 0, background: 'var(--fk-surface-sunken)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-lg)' }}>
          {basics.map((b, i) => <React.Fragment key={b}>{i > 0 && <div style={{ height: 1, background: 'var(--fk-divider)' }} />}<Row line={{ key: 'basic|' + b, name: b }} muted /></React.Fragment>)}
        </ul>
      </div>
    </div>
  )
}

/* ================================================================ Curate === */
function Curate({ ratings, setRating, onOpen }) {
  const queue = RECIPES.filter((r) => ratings[r.id]?.stars == null)
  const [idx, setIdx] = useState(0)
  const current = queue[idx]
  const rated = RECIPES.filter((r) => ratings[r.id]?.stars != null)
    .sort((a, b) => (ratings[b.id].stars) - (ratings[a.id].stars))
  const advance = () => setIdx((i) => Math.min(i + 1, queue.length))
  const rate = (id, v) => { setRating(id, 'stars', v); if (v != null && v <= 2) advance() }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <H1>Curate</H1><span style={{ fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}>{rated.length} rated · {queue.length} to triage</span>
      </div>
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}>
        {[5, 4, 3, 2, 1].map((n) => <span key={n} style={{ whiteSpace: 'nowrap' }}><b style={{ color: 'var(--fk-star-ink)' }}>★{n}</b> {STAR_LABELS[n]}</span>)}
      </div>
      {current ? <div style={{ marginTop: 20, display: 'flex', overflow: 'hidden', background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-2xl)', boxShadow: 'var(--fk-shadow-sm)' }}>
        <img src={current.image} alt="" onClick={() => onOpen(current.id)} style={{ width: '40%', objectFit: 'cover', cursor: 'pointer' }} />
        <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)' }}><Tag>{current.cuisine}</Tag><span>⏱ {current.prepTime} min</span><span style={{ textTransform: 'capitalize' }}>· {current.mainProtein}</span></div>
          <h2 style={{ margin: '8px 0 0', fontFamily: 'var(--fk-font-display)', fontWeight: 600, fontSize: 'var(--fk-text-h1)', letterSpacing: 'var(--fk-tracking-tight)' }}>{current.title}</h2>
          <p style={{ margin: '6px 0 0', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)', lineHeight: 'var(--fk-leading-normal)' }}>{current.description}</p>
          <div style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Eyebrow>Rating</Eyebrow><Stars value={ratings[current.id]?.stars} onChange={(v) => rate(current.id, v)} labels={STAR_LABELS} size="lg" showLabel /></div>
            {ratings[current.id]?.stars >= 3 && <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Eyebrow>How often</Eyebrow><Stars value={ratings[current.id]?.rotation} onChange={(v) => { setRating(current.id, 'rotation', v); advance() }} glyph="◆" color="var(--fk-info)" labels={ROTATION_LABELS} size="lg" showLabel /></div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6 }}>
              <Btn variant="ghost" size="sm" onClick={() => setIdx((i) => Math.max(0, i - 1))}>← Back</Btn>
              <Btn variant="ghost" size="sm" onClick={advance}>Skip →</Btn>
              <span style={{ marginLeft: 'auto', fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)' }}>Press 1–5 to rate · {idx + 1}/{queue.length}</span>
            </div>
          </div>
        </div>
      </div> : <div style={{ marginTop: 20, background: 'var(--fk-surface-card)', border: '1px dashed var(--fk-border-strong)', borderRadius: 'var(--fk-radius-2xl)', padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 'var(--fk-text-h3)', fontWeight: 600 }}>All triaged 🎉</p>
        <p style={{ margin: '4px 0 0', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}>Every recipe has a rating. Re-rate any below.</p></div>}

      {rated.length > 0 && <div style={{ marginTop: 40 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--fk-font-display)', fontWeight: 600, fontSize: 'var(--fk-text-h2)' }}>Rated <span style={{ fontSize: 'var(--fk-text-sm)', fontWeight: 400, color: 'var(--fk-text-muted)' }}>({rated.length})</span></h2>
        <ul style={{ margin: '12px 0 0', padding: 0, background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-lg)' }}>
          {rated.map((r, i) => <React.Fragment key={r.id}>{i > 0 && <div style={{ height: 1, background: 'var(--fk-divider)' }} />}
            <li style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', listStyle: 'none' }}>
              <img src={r.image} alt="" onClick={() => onOpen(r.id)} style={{ width: 40, height: 40, borderRadius: 'var(--fk-radius-md)', objectFit: 'cover', cursor: 'pointer' }} />
              <span style={{ flex: 1, minWidth: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
              <span style={{ fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)' }}>{r.cuisine}</span>
              <Stars value={ratings[r.id].stars} onChange={(v) => setRating(r.id, 'stars', v)} labels={STAR_LABELS} size="sm" />
            </li></React.Fragment>)}
        </ul>
      </div>}
    </div>
  )
}

/* ================================================================= Shell === */
const TABS = [['browse', 'Browse'], ['refine', 'Refine'], ['curate', 'Curate'], ['plan', 'Plan'], ['shop', 'Shop'], ['config', 'Config']]

function App() {
  const [dark, setDark] = useState(false)
  const [tab, setTab] = useState('browse')
  const [openId, setOpenId] = useState(null)
  const [ratings, setRatings] = useState(() => Object.fromEntries(RECIPES.filter((r) => r.seedStars).map((r) => [r.id, { stars: r.seedStars, rotation: r.seedStars >= 4 ? 4 : 3 }])))
  const [planIds, setPlanIds] = useState(['lemongrass-chicken-bowls', 'golden-chickpea-curry'])
  const [portions, setPortions] = useState(2)
  const [ticks, setTicks] = useState({})

  const setRating = (id, key, v) => setRatings((m) => ({ ...m, [id]: { ...m[id], [key]: v } }))
  const togglePlan = (id) => setPlanIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  const toggleTick = (k) => setTicks((t) => ({ ...t, [k]: !t[k] }))
  const open = (id) => { setOpenId(id); window.scrollTo && window.scrollTo(0, 0) }

  let screen
  if (openId) screen = <Recipe r={byId[openId]} ratings={ratings} setRating={setRating} inPlan={planIds.includes(openId)} togglePlan={togglePlan} onBack={() => setOpenId(null)} />
  else if (tab === 'browse') screen = <Browse ratings={ratings} onOpen={open} />
  else if (tab === 'curate') screen = <Curate ratings={ratings} setRating={setRating} onOpen={open} />
  else if (tab === 'plan') screen = <Plan ratings={ratings} planIds={planIds} togglePlan={togglePlan} portions={portions} setPortions={setPortions} onOpen={open} />
  else if (tab === 'shop') screen = <Shop planIds={planIds} portions={portions} ticks={ticks} toggleTick={toggleTick} onGoPlan={() => setTab('plan')} />
  else screen = <div style={{ color: 'var(--fk-text-muted)', padding: '40px 0', textAlign: 'center' }}>The <b style={{ color: 'var(--fk-text)' }}>{tab}</b> screen lives in the app — this kit demonstrates Browse, Recipe, Curate, Plan & Shop.</div>

  return (
    <div className={dark ? 'dark' : ''} style={{ minHeight: '100%', background: 'var(--fk-surface-page)', color: 'var(--fk-text)', fontFamily: 'var(--fk-font-body)' }}>
      <header style={{ borderBottom: '1px solid var(--fk-border)', background: 'var(--fk-surface-card)' }}>
        <div style={{ maxWidth: 'var(--fk-content-max)', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', padding: '12px 16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--fk-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--fk-font-display)', fontWeight: 700, fontSize: 18 }}>F</span>
            <span style={{ fontFamily: 'var(--fk-font-display)', fontWeight: 700, fontSize: 19, letterSpacing: 'var(--fk-tracking-tight)', whiteSpace: 'nowrap' }}>Forkast <span aria-hidden style={{ fontFamily: 'var(--fk-font-body)', fontWeight: 400 }}>🍴</span></span>
          </span>
          <nav style={{ order: 3, width: '100%', display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }} className="fk-nav">
            {TABS.map(([id, label]) => { const active = tab === id && !openId; return (
              <button key={id} type="button" onClick={() => { setTab(id); setOpenId(null) }}
                style={{ fontFamily: 'var(--fk-font-body)', fontWeight: 500, fontSize: 'var(--fk-text-sm)', padding: '6px 13px', borderRadius: 'var(--fk-radius-md)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  color: active ? 'var(--fk-brand-ink)' : 'var(--fk-text-muted)', background: active ? 'var(--fk-brand-tint)' : 'transparent', transition: 'background var(--fk-duration) var(--fk-ease)' }}>{label}</button>) })}
          </nav>
          <div style={{ marginLeft: 'auto' }}><IconBtn label={dark ? 'Light mode' : 'Dark mode'} onClick={() => setDark((d) => !d)}>{dark ? '☀' : '🌙'}</IconBtn></div>
        </div>
      </header>
      <main style={{ maxWidth: 'var(--fk-content-max)', margin: '0 auto', padding: '24px 16px 64px' }}>{screen}</main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
