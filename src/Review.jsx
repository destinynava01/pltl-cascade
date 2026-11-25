import { useCallback, useEffect, useState } from 'react'
import { casReview } from './api'
import { SignIn, SignInCard } from './SignIn'
import { supabase } from './supabase'
import { useSession } from './useSession'
import { Button, Label } from './ui'

const field = 'w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent'
const TABS = [{ id: 'pending', label: 'Waiting' }, { id: 'approved', label: 'Approved' }, { id: 'rejected', label: 'Rejected' }]

// Reviewers: approve, edit or reject submitted sequences (same sign-in as the other game sites)
export default function Review() {
  const session = useSession()
  if (session === undefined) return <SignInCard><p className="p-8 text-center text-muted">Checking access…</p></SignInCard>
  return session ? <Reviewer key={session.user.id} /> : <SignIn />
}

function Reviewer() {
  const [tab, setTab] = useState('pending')
  const [data, setData] = useState(null)
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [picked, setPicked] = useState([])

  const load = useCallback(() => casReview({ action: 'list', status: tab }).then((d) => { setData(d); setPicked([]); setError('') }).catch((e) => setError(e.message)), [tab])
  useEffect(() => { casReview({ action: 'whoami' }).then(setMe).catch((e) => setError(e.message)) }, [])
  useEffect(() => { load() }, [load])

  async function act(payload, done) {
    setError('')
    try {
      const r = await casReview(payload)
      setMessage(done ?? r.message ?? '')
      await load()
      return true
    } catch (e) {
      setError(e.message)
      return false
    }
  }

  if (error && !me) {
    return (
      <SignInCard>
        <div className="p-6 text-center">
          <p className="text-4xl">🔒</p>
          <p className="mt-3">{error}</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-4 font-bold text-info">Sign out</button>
        </div>
      </SignInCard>
    )
  }

  const list = data?.sequences ?? []
  return (
    <main className="water-bg min-h-dvh px-4 py-8 text-ink">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <a href="/" className="text-sm font-bold text-info hover:underline">← Back to the game</a>
          <p className="text-sm text-muted">{me?.email} · <button onClick={() => supabase.auth.signOut()} className="font-bold text-info">Sign out</button></p>
        </div>
        <header className="mt-2 text-center">
          <h1 className="font-display text-4xl font-extrabold text-accent">Sequence Review</h1>
          <p className="mt-1 text-muted">A sequence goes into games once it&apos;s approved. <a href="/submit" className="font-bold text-info">+ Submit new</a></p>
        </header>

        <nav className="mt-6 flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setMessage('') }}
              className={`rounded-xl border px-4 py-2 text-sm font-bold ${tab === t.id ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-panel hover:bg-hover'}`}>
              {t.label} <span className="ml-1 text-xs opacity-80">{data?.counts?.[t.id]}</span>
            </button>
          ))}
          {tab === 'pending' && list.length > 0 && (
            <>
              <button onClick={() => setPicked(picked.length === list.length ? [] : list.map((s) => s.id))} className="ml-2 text-sm font-bold text-info">{picked.length === list.length ? 'Clear selection' : `Select all ${list.length}`}</button>
              {picked.length > 0 && <Button className="!px-3 !py-1.5 text-sm" onClick={() => act({ action: 'set_status', ids: picked, status: 'approved' })}>✓ Approve {picked.length}</Button>}
            </>
          )}
        </nav>
        {message && <p className="mt-3 font-bold text-ok">{message}</p>}
        {error && <p className="mt-3 font-bold text-bad">{error}</p>}
        {!data && <p className="mt-6 text-muted">Loading…</p>}
        {data && list.length === 0 && <p className="mt-6 text-muted">Nothing here.</p>}
        <ul className="mt-4 space-y-3">
          {list.map((s) => <SequenceCard key={s.id} s={s} picked={picked.includes(s.id)} onPick={() => setPicked((x) => (x.includes(s.id) ? x.filter((y) => y !== s.id) : [...x, s.id]))} tab={tab} act={act} />)}
        </ul>
      </div>
    </main>
  )
}

function SequenceCard({ s, picked, onPick, tab, act }) {
  const [draft, setDraft] = useState(null)
  const save = async () => {
    const ok = await act({ action: 'save', id: s.id, subject: draft.subject, topic: draft.topic, title: draft.title, steps: draft.steps.map((x) => x.trim()).filter(Boolean) }, 'Saved.')
    if (ok) setDraft(null)
  }
  if (draft) {
    return (
      <li className="rounded-2xl border border-accent bg-card p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={field} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} aria-label="Subject" />
          <input className={field} value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} aria-label="Topic" />
          <input className={field} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Title" />
        </div>
        <ol className="mt-3 space-y-1.5">
          {draft.steps.map((step, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-6 text-right font-bold text-accent">{i + 1}</span>
              <input className={field} value={step} onChange={(e) => setDraft({ ...draft, steps: draft.steps.map((x, k) => (k === i ? e.target.value : x)) })} />
              <button type="button" disabled={i === 0} onClick={() => { const n = [...draft.steps]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setDraft({ ...draft, steps: n }) }} className="rounded-lg border border-line px-2 text-xs disabled:opacity-30">▲</button>
              <button type="button" onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, k) => k !== i) })} className="px-1 text-xs text-bad">✕</button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setDraft({ ...draft, steps: [...draft.steps, ''] })} className="mt-2 text-sm font-bold text-info">+ Add a step</button>
        <div className="mt-3 flex gap-2">
          <Button className="!px-4 !py-2 text-sm" onClick={save}>Save</Button>
          <Button variant="outline" className="!px-4 !py-2 text-sm" onClick={() => setDraft(null)}>Cancel</Button>
        </div>
      </li>
    )
  }
  return (
    <li className={`rounded-2xl border bg-card p-4 ${picked ? 'border-accent' : 'border-line'}`}>
      <div className="flex gap-3">
        {tab === 'pending' && <input type="checkbox" checked={picked} onChange={onPick} className="mt-1.5 h-4 w-4 accent-teal-400" aria-label={`Select ${s.title}`} />}
        <div className="min-w-0 flex-1">
          <Label>{s.subject} · {s.topic}</Label>
          <p className="font-display text-xl font-bold">{s.title}</p>
          <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm">{s.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          <p className="mt-2 text-xs text-muted">From {s.submitter_name || 'unknown'}{s.submitter_note ? ` · "${s.submitter_note}"` : ''}{s.reviewed_by ? ` · ${s.status} by ${s.reviewed_by}` : ''}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
            {s.status !== 'approved' && <button onClick={() => act({ action: 'set_status', ids: [s.id], status: 'approved' })} className="rounded-lg bg-accent px-3 py-1 text-on-accent">✓ Approve</button>}
            {s.status !== 'rejected' && <button onClick={() => act({ action: 'set_status', ids: [s.id], status: 'rejected' })} className="rounded-lg border border-bad px-3 py-1 text-bad">✕ Reject</button>}
            {s.status !== 'pending' && <button onClick={() => act({ action: 'set_status', ids: [s.id], status: 'pending' })} className="rounded-lg border border-line px-3 py-1">Back to waiting</button>}
            <button onClick={() => setDraft({ subject: s.subject, topic: s.topic, title: s.title, steps: [...s.steps] })} className="rounded-lg border border-info px-3 py-1 text-info">✎ Edit</button>
            {s.status === 'rejected' && <button onClick={() => window.confirm(`Delete "${s.title}" for good?`) && act({ action: 'delete', id: s.id })} className="px-2 py-1 text-bad">Delete</button>}
          </div>
        </div>
      </div>
    </li>
  )
}
