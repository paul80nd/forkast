/* ============================================================================
   Forkast — interactive UI-kit recreation (Fresh Organic direction).
   A cosmetic, click-through rebuild of the real app's screens: Browse, Recipe,
   Plan, Shop, Curate — composed from token-driven primitives. Not production
   logic; it demonstrates the visual system in motion. Mounts into #root.
   ============================================================================ */
const { useState, useMemo, useRef, useEffect } = React
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
function Switch({ checked, onChange, label }) {
  return <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--fk-font-body)',
    fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
    <button type="button" role="switch" aria-checked={checked} aria-label={typeof label === 'string' ? label : undefined} onClick={() => onChange(!checked)}
      style={{ width: 38, height: 22, flex: 'none', borderRadius: 999, border: 'none', padding: 2, cursor: 'pointer',
        background: checked ? 'var(--fk-brand)' : 'var(--fk-neutral-300)', display: 'inline-flex', alignItems: 'center',
        transition: 'background var(--fk-duration) var(--fk-ease)' }}>
      <span style={{ width: 18, height: 18, borderRadius: 999, background: '#fff', boxShadow: 'var(--fk-shadow-xs)',
        transform: checked ? 'translateX(16px)' : 'translateX(0)', transition: 'transform var(--fk-duration) var(--fk-ease)' }} />
    </button>{label}</label>
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
/* A button that opens a popover of secondary controls, with an active-count badge.
   Closes on outside click. Powers the Browse "Filters" pattern. */
function FilterPopover({ label = 'Filters', count = 0, children }) {
  const [open, setOpen] = useState(false)
  const [h, setH] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const active = count > 0 || open
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--fk-font-body)', fontWeight: 500, fontSize: 'var(--fk-text-sm)',
          padding: '7px 13px', borderRadius: 'var(--fk-radius-md)', cursor: 'pointer',
          color: active ? 'var(--fk-brand-ink)' : 'var(--fk-text-muted)',
          background: active ? 'var(--fk-brand-tint)' : (h ? 'var(--fk-surface-sunken)' : 'var(--fk-surface-card)'),
          border: '1px solid ' + (active ? 'var(--fk-green-300)' : 'var(--fk-border-strong)'), transition: 'all var(--fk-duration) var(--fk-ease)' }}>
        {label}
        {count > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--fk-brand)', color: '#fff', fontSize: 'var(--fk-text-2xs)', fontWeight: 600 }}>{count}</span>}
        <span aria-hidden style={{ fontSize: 11 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30, width: 250,
          background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-lg)', boxShadow: 'var(--fk-shadow-lg)', padding: 14 }}>
          {children}
        </div>
      )}
    </span>
  )
}

/* ============================================================ RecipeCard === */
function RecipeCard({ r, stars, onOpen, selectMode, selected, onToggleSelect }) {
  const [h, setH] = useState(false)
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={selectMode ? onToggleSelect : onOpen}
      style={{ cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--fk-surface-card)',
        border: '1px solid ' + (selected ? 'var(--fk-brand)' : 'var(--fk-border)'),
        borderRadius: 'var(--fk-radius-lg)', boxShadow: selected ? 'var(--fk-shadow-focus)' : h ? 'var(--fk-shadow-md)' : 'var(--fk-shadow-sm)',
        transform: h && !selectMode ? 'translateY(var(--fk-lift))' : 'none', transition: 'transform var(--fk-duration) var(--fk-ease), box-shadow var(--fk-duration) var(--fk-ease)' }}>
      <div style={{ position: 'relative' }}>
        <img src={r.image} alt="" style={{ aspectRatio: '4 / 3', width: '100%', objectFit: 'cover', display: 'block' }} />
        {stars != null && <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,.92)', color: 'var(--fk-star-ink)', fontSize: 'var(--fk-text-xs)', fontWeight: 600, padding: '2px 8px', borderRadius: 999, boxShadow: 'var(--fk-shadow-xs)' }}>{'★'.repeat(stars)}</span>}
        {selectMode && <label onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 8, right: 8, display: 'flex', background: 'rgba(255,255,255,.92)', padding: 4, borderRadius: 'var(--fk-radius-sm)', boxShadow: 'var(--fk-shadow-xs)', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!selected} onChange={onToggleSelect} aria-label={'Select ' + r.title} style={{ width: 16, height: 16, accentColor: 'var(--fk-brand)' }} /></label>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 12 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--fk-font-display)', fontWeight: 600, fontSize: 'var(--fk-text-h3)', lineHeight: 'var(--fk-leading-snug)', color: 'var(--fk-text)' }}>{r.title}</h3>
        <p style={{ margin: '4px 0 0', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)', lineHeight: 'var(--fk-leading-snug)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</p>
        <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)', whiteSpace: 'nowrap' }}>⏱ {r.prepTime} min <span style={{ textTransform: 'capitalize' }}>· {r.mainProtein}</span></span>
          <span style={{ fontSize: 'var(--fk-text-sm)', fontWeight: 400, color: 'var(--fk-text)', whiteSpace: 'nowrap' }}>{r.cuisine}</span>
        </div>
      </div>
    </div>
  )
}

/* ================================================================ Browse === */
function SkeletonCard() {
  const block = (s) => <div style={{ background: 'var(--fk-surface-sunken)', borderRadius: 'var(--fk-radius-sm)', animation: 'fk-pulse 1.2s var(--fk-ease) infinite', ...s }} />
  return (
    <div style={{ overflow: 'hidden', background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-lg)', boxShadow: 'var(--fk-shadow-sm)' }}>
      {block({ aspectRatio: '4 / 3', width: '100%', borderRadius: 0 })}
      <div style={{ padding: 12 }}>
        {block({ height: 15, width: '72%' })}
        {block({ height: 11, width: '95%', marginTop: 9 })}
        {block({ height: 11, width: '55%', marginTop: 6 })}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>{block({ height: 10, width: 74 })}{block({ height: 10, width: 42 })}</div>
      </div>
    </div>
  )
}
function Browse({ ratings, onOpen, removed, onRemove }) {
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState('all')
  const [sort, setSort] = useState('rating')
  const [group, setGroup] = useState(true)
  const [maxTime, setMaxTime] = useState('any')
  const [rating, setRating] = useState('all')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const toggleSel = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  const exitSelect = () => { setSelectMode(false); setSelected([]) }
  const cuisines = [...new Set(RECIPES.map((r) => r.cuisine))].sort()
  const list = useMemo(() => {
    let l = RECIPES.filter((r) => !removed.includes(r.id))
    const q = query.trim().toLowerCase()
    if (q) l = l.filter((r) => r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.includes(q)))
    if (cuisine !== 'all') l = l.filter((r) => r.cuisine === cuisine)
    if (maxTime !== 'any') l = l.filter((r) => r.prepTime <= Number(maxTime))
    if (rating !== 'all') l = l.filter((r) => {
      const s = ratings[r.id]?.stars
      if (rating === 'unrated') return s == null
      if (rating === '5') return s === 5
      if (rating === '4plus') return s >= 4
      return s >= 3
    })
    l.sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'time' ? a.prepTime - b.prepTime
      : (ratings[b.id]?.stars ?? 0) - (ratings[a.id]?.stars ?? 0))
    return l
  }, [query, cuisine, maxTime, rating, sort, ratings, removed])

  const timeLabels = { 20: '≤ 20 min', 30: '≤ 30 min', 45: '≤ 45 min' }
  const ratingLabels = { unrated: 'Unrated', '5': '★5 only', '4plus': '★4+', '3plus': '★3+' }
  const chips = []
  if (cuisine !== 'all') chips.push({ label: cuisine, clear: () => setCuisine('all') })
  if (maxTime !== 'any') chips.push({ label: timeLabels[maxTime], clear: () => setMaxTime('any') })
  if (rating !== 'all') chips.push({ label: ratingLabels[rating], clear: () => setRating('all') })
  const clearAll = () => { setCuisine('all'); setMaxTime('any'); setRating('all') }
  const clearEverything = () => { clearAll(); setQuery('') }
  // Brief skeleton pass whenever the query changes — stands in for a paged fetch.
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 420)
    return () => clearTimeout(t)
  }, [query, cuisine, maxTime, rating, sort, removed])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <H1>Browse</H1>
        <span style={{ fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}>{list.length} {list.length === 1 ? 'dish' : 'dishes'} of {RECIPES.length}</span>
      </div>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--fk-surface-page)', margin: '12px -16px 0', padding: '6px 16px 12px', borderBottom: '1px solid var(--fk-divider)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Field type="search" value={query} placeholder="Search title or ingredient…" onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <Sel value={sort} onChange={(e) => setSort(e.target.value)}><option value="rating">Top rated (your ★)</option><option value="time">Quickest</option><option value="name">A–Z</option></Sel>
        <FilterPopover label="Filters" count={chips.length}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><Eyebrow>Cuisine</Eyebrow><div style={{ marginTop: 6 }}><Sel value={cuisine} onChange={(e) => setCuisine(e.target.value)} style={{ width: '100%' }}><option value="all">All cuisines</option>{cuisines.map((c) => <option key={c}>{c}</option>)}</Sel></div></div>
            <div><Eyebrow>Max time</Eyebrow><div style={{ marginTop: 6 }}><Sel value={maxTime} onChange={(e) => setMaxTime(e.target.value)} style={{ width: '100%' }}><option value="any">Any time</option><option value="20">≤ 20 min</option><option value="30">≤ 30 min</option><option value="45">≤ 45 min</option></Sel></div></div>
            <div><Eyebrow>Rating</Eyebrow><div style={{ marginTop: 6 }}><Sel value={rating} onChange={(e) => setRating(e.target.value)} style={{ width: '100%' }}><option value="all">Any rating</option><option value="unrated">Unrated</option><option value="5">★5 only</option><option value="4plus">★4+</option><option value="3plus">★3+</option></Sel></div></div>
            {chips.length > 0 && <Btn variant="ghost" size="sm" onClick={clearAll}>Clear all filters</Btn>}
          </div>
        </FilterPopover>
        <span aria-hidden style={{ width: 1, alignSelf: 'stretch', minHeight: 26, background: 'var(--fk-divider)', margin: '0 2px' }} />
        <Switch checked={group} onChange={setGroup} label="Group variants" />
        <Btn variant={selectMode ? 'soft' : 'outline'} size="sm" onClick={() => selectMode ? exitSelect() : setSelectMode(true)}>{selectMode ? 'Done' : 'Select'}</Btn>
      </div>

      {chips.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {chips.map((c, i) => (
            <button key={i} type="button" onClick={c.clear} title={'Remove ' + c.label}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-xs)', fontWeight: 500,
                padding: '4px 10px', borderRadius: 'var(--fk-radius-full)', border: 'none', cursor: 'pointer', background: 'var(--fk-brand-tint)', color: 'var(--fk-brand-ink)' }}>
              {c.label} <span aria-hidden style={{ opacity: .65 }}>✕</span>
            </button>
          ))}
          <button type="button" onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)', padding: '4px 6px' }}>Clear all</button>
        </div>
      )}
      </div>
      {selectMode && (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          background: selected.length ? 'var(--fk-brand-wash)' : 'var(--fk-surface-sunken)',
          border: '1px solid ' + (selected.length ? 'var(--fk-green-200)' : 'var(--fk-border)'), borderRadius: 'var(--fk-radius-md)', padding: '8px 12px' }}>
          <span style={{ fontSize: 'var(--fk-text-sm)', fontWeight: 500, color: 'var(--fk-text)' }}>{selected.length ? selected.length + ' selected' : 'Tap cards to select'}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn variant="ghost" size="sm" onClick={() => setSelected([])} disabled={!selected.length}>Clear</Btn>
            <Btn variant="danger" size="sm" onClick={() => { onRemove(selected); setSelected([]) }} disabled={!selected.length}>Delete selected</Btn>
          </div>
        </div>
      )}
      {loading ? (
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : list.length === 0 ? (
        <div style={{ marginTop: 24, background: 'var(--fk-surface-card)', border: '1px dashed var(--fk-border-strong)', borderRadius: 'var(--fk-radius-2xl)', padding: '44px 24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 'var(--fk-text-h3)', fontWeight: 600, color: 'var(--fk-text)' }}>No recipes match those filters</p>
          <p style={{ margin: '4px 0 14px', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}>Try widening your search or clearing a filter.</p>
          <Btn variant="soft" size="sm" onClick={clearEverything}>Clear all filters</Btn>
        </div>
      ) : (
        <>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
            {list.map((r) => <RecipeCard key={r.id} r={r} stars={ratings[r.id]?.stars} onOpen={() => onOpen(r.id)}
              selectMode={selectMode} selected={selected.includes(r.id)} onToggleSelect={() => toggleSel(r.id)} />)}
          </div>
          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-subtle)' }}>That's everything · {list.length} {list.length === 1 ? 'dish' : 'dishes'}</p>
        </>
      )}
    </div>
  )
}

/* ================================================================ Recipe === */
function MenuItem({ children, onClick, tone }) {
  const [h, setH] = useState(false)
  const danger = tone === 'danger'
  return <button type="button" role="menuitem" onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 13px', border: 'none', cursor: 'pointer', fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-sm)', fontWeight: 500,
      color: danger ? 'var(--fk-danger-ink)' : 'var(--fk-text)', background: h ? (danger ? 'var(--fk-danger-wash)' : 'var(--fk-surface-sunken)') : 'transparent' }}>{children}</button>
}
function Recipe({ r, ratings, setRating, inPlan, togglePlan, onBack, onDelete }) {
  const rt = ratings[r.id] || {}
  const [menuOpen, setMenuOpen] = useState(false)
  const [serves, setServes] = useState(r.serves)
  const [checkedIng, setCheckedIng] = useState([])
  const [checkedStep, setCheckedStep] = useState([])
  const [showParsed, setShowParsed] = useState(false)
  const factor = serves / r.serves
  const scaleQty = (q) => { const v = q * factor; return Number.isInteger(v) ? v : Math.round(v * 10) / 10 }
  const ingLabel = (i) => (factor === 1 || i.qty == null) ? i.rawLabel : scaleQty(i.qty) + (i.unit ? ' ' + i.unit : '') + ' ' + i.name
  const toggleIng = (k) => setCheckedIng((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k])
  const toggleStep = (k) => setCheckedStep((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k])
  return (
    <div>
      <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-brand-ink)' }}>← Back to Browse</button>
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) 3fr', gap: 24, alignItems: 'start' }}>
        {/* left column */}
        <div>
          <img src={r.image} alt="" style={{ aspectRatio: '4 / 3', width: '100%', borderRadius: 'var(--fk-radius-xl)', objectFit: 'cover' }} />
          {/* Primary action fused to a menu (⋯) — Add-to-week + Delete, per the app. */}
          <div style={{ position: 'relative', marginTop: 12, display: 'flex' }}>
            <button type="button" onClick={() => togglePlan(r.id)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'var(--fk-font-body)', fontWeight: 500, fontSize: 'var(--fk-text-body)', padding: '9px 15px', border: 'none', borderRadius: 'var(--fk-radius-md) 0 0 var(--fk-radius-md)', cursor: 'pointer', background: inPlan ? 'var(--fk-positive-tint)' : 'var(--fk-brand)', color: inPlan ? 'var(--fk-positive-ink)' : '#fff' }}>
              <span aria-hidden>{inPlan ? '✓' : '+'}</span>{inPlan ? 'In this week' : 'Add to week'}
            </button>
            <button type="button" aria-label="More actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} style={{ padding: '0 11px', border: 'none', borderLeft: '1px solid ' + (inPlan ? 'var(--fk-green-200)' : 'rgba(255,255,255,.3)'), borderRadius: '0 var(--fk-radius-md) var(--fk-radius-md) 0', cursor: 'pointer', background: inPlan ? 'var(--fk-positive-tint)' : 'var(--fk-brand)', color: inPlan ? 'var(--fk-positive-ink)' : '#fff', fontSize: 'var(--fk-text-body)' }}>▾</button>
            {menuOpen && <React.Fragment>
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
              <div role="menu" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 20, minWidth: 184, background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-md)', boxShadow: 'var(--fk-shadow-lg)', overflow: 'hidden' }}>
                <MenuItem tone="danger" onClick={() => { setMenuOpen(false); if (window.confirm('Delete “' + r.title + '”?\n\nThis removes it and its rating for good (re-import to restore).')) onDelete() }}>Delete recipe</MenuItem>
              </div>
            </React.Fragment>}
          </div>
          <dl style={{ margin: '16px 0 0', fontSize: 'var(--fk-text-sm)' }}>
            {[['Cuisine', r.cuisine], ['Time', r.prepTime + ' min'], ['Main', r.mainProtein]].map(([k, v]) =>
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--fk-divider)' }}>
                <dt style={{ color: 'var(--fk-text-muted)' }}>{k}</dt><dd style={{ margin: 0, fontWeight: 500, whiteSpace: 'nowrap', textTransform: k === 'Main' ? 'capitalize' : 'none' }}>{v}</dd></div>)}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--fk-divider)' }}>
              <dt style={{ color: 'var(--fk-text-muted)' }}>Serves</dt>
              <span style={{ display: 'inline-flex', overflow: 'hidden', border: '1px solid var(--fk-border-strong)', borderRadius: 'var(--fk-radius-md)' }}>
                {[2, 4, 6].map((n, i) => <button key={n} type="button" onClick={() => setServes(n)} style={{ fontFamily: 'var(--fk-font-body)', fontWeight: 500, fontSize: 'var(--fk-text-sm)', padding: '3px 11px', border: 'none', borderLeft: i ? '1px solid var(--fk-border)' : 'none', background: serves === n ? 'var(--fk-brand)' : 'var(--fk-surface-card)', color: serves === n ? '#fff' : 'var(--fk-text-muted)', cursor: 'pointer' }}>{n}</button>)}
              </span>
            </div>
          </dl>
          <div style={{ marginTop: 16, background: 'var(--fk-surface-sunken)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-lg)', padding: 14 }}>
            <Eyebrow>Your rating</Eyebrow>
            <div style={{ marginTop: 8 }}><Stars value={rt.stars} onChange={(v) => setRating(r.id, 'stars', v)} labels={STAR_LABELS} size="lg" showLabel /></div>
            {rt.stars >= 3 && <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)' }}>How often</span>
              <Stars value={rt.rotation} onChange={(v) => setRating(r.id, 'rotation', v)} glyph="◆" color="var(--fk-info)" labels={ROTATION_LABELS} showLabel /></div>}
          </div>
          {r.allergens.length > 0 && <div style={{ marginTop: 16 }}><Eyebrow>Allergens</Eyebrow>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{r.allergens.map((a) => <Tag key={a} tone="warn" square>{a}</Tag>)}</div></div>}
          {r.tags && r.tags.length > 0 && <div style={{ marginTop: 16 }}><Eyebrow>Tags</Eyebrow>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{r.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div></div>}
          {r.nutrition && <div style={{ marginTop: 16, border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-lg)', padding: 14 }}>
            <Eyebrow>Nutrition <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--fk-text-subtle)' }}>· per serving</span></Eyebrow>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--fk-divider)' }}>
              <span style={{ color: 'var(--fk-text-muted)', fontSize: 'var(--fk-text-sm)' }}>Energy</span>
              <span style={{ fontFamily: 'var(--fk-font-display)', fontWeight: 600, fontSize: 'var(--fk-text-h3)', color: 'var(--fk-text)', whiteSpace: 'nowrap' }}>{Math.round(r.nutrition.kcal)} kcal</span>
            </div>
            {[['Protein', r.nutrition.protein + ' g'], ['Fat', r.nutrition.fat + ' g', '(' + r.nutrition.saturates + ' g sat)'], ['Carbs', r.nutrition.carbs + ' g', '(' + r.nutrition.sugars + ' g sugar)'], ['Fibre', r.nutrition.fibre + ' g'], ['Salt', r.nutrition.salt + ' g']].map(([k, main, detail]) =>
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '5px 0', fontSize: 'var(--fk-text-sm)' }}>
                <span style={{ color: 'var(--fk-text-muted)' }}>{k}</span>
                <span style={{ textAlign: 'right' }}><span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{main}</span>{detail && <span style={{ color: 'var(--fk-text-muted)', whiteSpace: 'nowrap' }}> {detail}</span>}</span></div>)}
          </div>}
        </div>
        {/* right */}
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--fk-font-display)', fontWeight: 600, fontSize: 'var(--fk-text-h1)', letterSpacing: 'var(--fk-tracking-tight)' }}>{r.title}</h1>
          <p style={{ marginTop: 8, color: 'var(--fk-text-muted)', fontSize: 'var(--fk-text-body)', lineHeight: 'var(--fk-leading-normal)' }}>{r.description}</p>

          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
                <Eyebrow>Ingredients</Eyebrow>
                {factor !== 1 && <span style={{ fontSize: 'var(--fk-text-xs)', color: 'var(--fk-brand-ink)', whiteSpace: 'nowrap' }}>· scaled for {serves}</span>}
              </span>
              <button type="button" onClick={() => setShowParsed((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)', padding: 0 }}>{showParsed ? 'Hide parsed' : 'Show parsed'}</button>
            </div>
            <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
              {r.ingredients.map((i, k) => {
                const on = checkedIng.includes(k)
                return <li key={k} onClick={() => toggleIng(k)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--fk-divider)', cursor: 'pointer' }}>
                  <span style={{ flex: 'none', width: 18, height: 18, borderRadius: 'var(--fk-radius-sm)', border: '1px solid ' + (on ? 'var(--fk-brand)' : 'var(--fk-border-strong)'), background: on ? 'var(--fk-brand)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{on ? '✓' : ''}</span>
                  <span style={{ flex: 1, color: on ? 'var(--fk-text-muted)' : 'var(--fk-text)', textDecoration: on ? 'line-through' : 'none' }}>{ingLabel(i)}</span>
                  {showParsed && <span style={{ fontFamily: 'var(--fk-font-mono)', fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-subtle)', whiteSpace: 'nowrap' }}>{i.qty != null ? scaleQty(i.qty) : '—'}{i.unit ? ' ' + i.unit : ''} · {i.name}</span>}
                </li>
              })}
            </ul>
            <p style={{ marginTop: 10, fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}><b style={{ color: 'var(--fk-text)' }}>Store cupboard:</b> {r.basics.join(', ')}</p>
          </div>

          <div style={{ marginTop: 20 }}><Eyebrow>Method</Eyebrow>
            <ol style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {r.instructions.map((s, k) => {
                const on = checkedStep.includes(k)
                return <li key={k} onClick={() => toggleStep(k)} style={{ display: 'flex', gap: 12, padding: '8px 0', cursor: 'pointer', borderBottom: k < r.instructions.length - 1 ? '1px solid var(--fk-divider)' : 'none' }}>
                  <span style={{ flex: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: on ? 'var(--fk-brand)' : 'var(--fk-brand-tint)', color: on ? '#fff' : 'var(--fk-brand-ink)', fontSize: 'var(--fk-text-sm)', fontWeight: 600 }}>{on ? '✓' : k + 1}</span>
                  <span style={{ color: on ? 'var(--fk-text-muted)' : 'var(--fk-text)', textDecoration: on ? 'line-through' : 'none', lineHeight: 'var(--fk-leading-normal)' }}>{s}</span></li>
              })}
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
  // Freeze the triage queue at mount so a card stays put through the ★ → ◆ phases
  // (rating it doesn't yank it out of the list mid-rate). Advance is explicit.
  const [queue] = useState(() => RECIPES.filter((r) => ratings[r.id]?.stars == null).map((r) => r.id))
  const [idx, setIdx] = useState(0)
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const fireToast = (node) => { setToast(node); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 3600) }

  const total = queue.length
  const triaged = queue.filter((id) => ratings[id]?.stars != null).length
  const current = idx < queue.length ? byId[queue[idx]] : null
  const cur = current ? (ratings[current.id] || {}) : {}
  const phase = !current ? null : cur.stars == null ? 'stars' : (cur.stars >= 3 && cur.rotation == null ? 'rotation' : 'done')
  const pct = total ? Math.round((triaged / total) * 100) : 100
  const hint = phase === 'rotation' ? 'Now — how often would you cook it?' : 'Press 1–5 to rate'

  const advance = () => setIdx((i) => Math.min(i + 1, queue.length))
  const back = () => setIdx((i) => Math.max(0, i - 1))
  const undo = (id) => { setRating(id, 'stars', undefined); setRating(id, 'rotation', undefined); setToast(null); back() }
  const undoToast = (r, stars) => fireToast(
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <span>Rated <span style={{ color: 'var(--fk-star)' }}>{'★'.repeat(stars)}</span> · {r.title}</span>
      <button type="button" onClick={() => undo(r.id)} style={{ background: 'none', border: 'none', color: 'var(--fk-brand)', fontWeight: 600, cursor: 'pointer', font: 'inherit' }}>Undo</button>
    </span>
  )
  const rateStars = (v) => {
    if (!current) return
    setRating(current.id, 'stars', v)
    if (v == null) return
    if (v <= 2) { undoToast(current, v); advance() }   // binned → done, move on
  }
  const rateRotation = (v) => {
    if (!current || v == null) return
    setRating(current.id, 'rotation', v)
    undoToast(current, cur.stars)
    advance()
  }

  const rated = RECIPES.filter((r) => ratings[r.id]?.stars != null)
    .sort((a, b) => (ratings[b.id].stars) - (ratings[a.id].stars))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <H1>Curate</H1><span style={{ fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}>{rated.length} rated · {total - triaged} to triage</span>
      </div>

      {total > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)', marginBottom: 6 }}>
            <span style={{ whiteSpace: 'nowrap' }}>Triage progress</span><span style={{ whiteSpace: 'nowrap' }}>{triaged} of {total}</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'var(--fk-surface-sunken)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: 'var(--fk-brand)', borderRadius: 999, transition: 'width var(--fk-duration-lg) var(--fk-ease)' }} />
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)' }}>
        {[5, 4, 3, 2, 1].map((n) => <span key={n} style={{ whiteSpace: 'nowrap' }}><b style={{ color: 'var(--fk-star-ink)' }}>★{n}</b> {STAR_LABELS[n]}</span>)}
      </div>

      {current ? <div style={{ marginTop: 18, display: 'flex', overflow: 'hidden', background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)', borderRadius: 'var(--fk-radius-2xl)', boxShadow: 'var(--fk-shadow-sm)' }}>
        <img src={current.image} alt="" onClick={() => onOpen(current.id)} style={{ width: '40%', objectFit: 'cover', cursor: 'pointer' }} />
        <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)' }}><Tag>{current.cuisine}</Tag><span style={{ whiteSpace: 'nowrap' }}>⏱ {current.prepTime} min</span><span style={{ whiteSpace: 'nowrap', textTransform: 'capitalize' }}>· {current.mainProtein}</span></div>
          <h2 style={{ margin: '8px 0 0', fontFamily: 'var(--fk-font-display)', fontWeight: 600, fontSize: 'var(--fk-text-h1)', letterSpacing: 'var(--fk-tracking-tight)' }}>{current.title}</h2>
          <p style={{ margin: '6px 0 0', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)', lineHeight: 'var(--fk-leading-normal)' }}>{current.description}</p>
          <div style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: phase === 'stars' ? 1 : 0.55, transition: 'opacity var(--fk-duration) var(--fk-ease)' }}>
              <Eyebrow>Rating</Eyebrow>
              <Stars value={cur.stars} onChange={rateStars} labels={STAR_LABELS} size="lg" showLabel />
              {cur.stars != null && <span style={{ fontSize: 'var(--fk-text-xs)', color: 'var(--fk-brand-ink)', fontWeight: 600 }}>✓ set</span>}
            </div>
            {cur.stars >= 3 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, transition: 'background var(--fk-duration) var(--fk-ease)',
                ...(phase === 'rotation' ? { background: 'var(--fk-info-wash)', border: '1px solid var(--fk-harbour-200)', borderRadius: 'var(--fk-radius-md)', padding: '8px 10px', margin: '-4px 0' } : {}) }}>
                <Eyebrow color={phase === 'rotation' ? 'var(--fk-info-ink)' : 'var(--fk-text-muted)'}>How often</Eyebrow>
                <Stars value={cur.rotation} onChange={rateRotation} glyph="◆" color="var(--fk-info)" labels={ROTATION_LABELS} size="lg" showLabel />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6 }}>
              <Btn variant="ghost" size="sm" onClick={back}>← Back</Btn>
              <Btn variant="ghost" size="sm" onClick={advance}>Skip →</Btn>
              <span style={{ marginLeft: 'auto', fontSize: 'var(--fk-text-xs)', color: phase === 'rotation' ? 'var(--fk-info-ink)' : 'var(--fk-text-muted)', fontWeight: phase === 'rotation' ? 600 : 400 }}>{hint} · {idx + 1}/{total}</span>
            </div>
          </div>
        </div>
      </div> : <div style={{ marginTop: 18, background: 'var(--fk-surface-card)', border: '1px dashed var(--fk-border-strong)', borderRadius: 'var(--fk-radius-2xl)', padding: '40px 24px', textAlign: 'center' }}>
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

      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 60, display: 'inline-flex', alignItems: 'center', maxWidth: '90vw',
          background: 'var(--fk-text)', color: 'var(--fk-surface-card)', fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-sm)',
          padding: '10px 16px', borderRadius: 'var(--fk-radius-full)', boxShadow: 'var(--fk-shadow-lg)' }}>
          {toast}
        </div>
      )}
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
  const [removedIds, setRemovedIds] = useState([])

  const setRating = (id, key, v) => setRatings((m) => ({ ...m, [id]: { ...m[id], [key]: v } }))
  const togglePlan = (id) => setPlanIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  const toggleTick = (k) => setTicks((t) => ({ ...t, [k]: !t[k] }))
  const removeRecipes = (ids) => setRemovedIds((s) => [...new Set([...s, ...ids])])
  const open = (id) => { setOpenId(id); window.scrollTo && window.scrollTo(0, 0) }
  const deleteRecipe = (id) => { removeRecipes([id]); setPlanIds((p) => p.filter((x) => x !== id)); setOpenId(null) }

  let screen
  if (openId) screen = <Recipe r={byId[openId]} ratings={ratings} setRating={setRating} inPlan={planIds.includes(openId)} togglePlan={togglePlan} onBack={() => setOpenId(null)} onDelete={() => deleteRecipe(openId)} />
  else if (tab === 'browse') screen = <Browse ratings={ratings} onOpen={open} removed={removedIds} onRemove={removeRecipes} />
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
