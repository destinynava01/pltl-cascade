import { useEffect, useState } from 'react'
import { casSequences } from './api'
import { Button, Label, Panel } from './ui'

const field = 'w-full rounded-2xl border border-line bg-panel px-3 py-2 text-ink outline-none placeholder:text-muted focus:border-accent'

// The public form: a sequence is a subject, a topic, a title, and its steps IN ORDER. Reviewers approve it before
// it's used in a game.
export default function Submit() {
  const [places, setPlaces] = useState(null)
  const [limits, setLimits] = useState({ min: 3, max: 12 })
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [title, setTitle] = useState('')
  const [steps, setSteps] = useState(['', '', ''])
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    casSequences({ action: 'places' }).then((d) => { setPlaces(d.subjects); setLimits({ min: d.min_steps, max: d.max_steps }) }).catch((e) => setError(e.message))
  }, [])

  const topicsFor = places?.find((p) => p.subject.toLowerCase() === subject.trim().toLowerCase())?.topics ?? []
  const filled = steps.map((s) => s.trim()).filter(Boolean)
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= steps.length) return
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]]
    setSteps(next)
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await casSequences({ action: 'submit', subject, topic, title, steps: filled, submitter_name: name, submitter_note: note })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <main className="water-bg flex min-h-dvh items-center justify-center p-4 text-ink">
        <Panel className="w-full max-w-md text-center">
          <p className="text-5xl">🌊</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-ok">Thanks!</h1>
          <p className="mt-2">&ldquo;{title}&rdquo; was sent to the reviewers. Once it&apos;s approved, it shows up in the lobby.</p>
          <Button className="mt-6 w-full" onClick={() => { setDone(false); setTitle(''); setSteps(['', '', '']) }}>Submit another</Button>
          <a href="/" className="mt-3 block text-sm font-bold text-info">← Back to the game</a>
        </Panel>
      </main>
    )
  }

  return (
    <main className="water-bg min-h-dvh px-4 py-8 text-ink">
      <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
        <a href="/" className="text-sm font-bold text-info hover:underline">← Back to the game</a>
        <header className="text-center">
          <h1 className="font-display text-4xl font-extrabold text-accent">Submit a sequence</h1>
          <p className="mt-2 text-muted">
            Any process with a clear order works: the phases of mitosis, the steps of balancing an equation, a lab
            procedure. Each step becomes one card. Write them in the <b className="text-ink">right order</b>; the game shuffles them.
          </p>
        </header>

        <Panel className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Subject</Label>
              <input className={`${field} mt-1`} list="subjects" maxLength={60} placeholder="Biology" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              <datalist id="subjects">{(places ?? []).map((p) => <option key={p.subject} value={p.subject} />)}</datalist>
            </div>
            <div>
              <Label>Topic</Label>
              <input className={`${field} mt-1`} list="topics" maxLength={80} placeholder="Cell division" value={topic} onChange={(e) => setTopic(e.target.value)} required />
              <datalist id="topics">{topicsFor.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
          </div>
          <p className="text-xs text-muted">Pick an existing subject and topic from the list, or type a new one.</p>
          <div>
            <Label>Title</Label>
            <input className={`${field} mt-1`} maxLength={120} placeholder="Phases of mitosis" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
        </Panel>

        <Panel>
          <div className="flex items-baseline justify-between">
            <Label>Steps, in order ({filled.length}/{limits.max})</Label>
            <span className="text-xs text-muted">At least {limits.min}</span>
          </div>
          <ol className="mt-3 space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-6 text-right font-display font-bold text-accent">{i + 1}</span>
                <input className={field} maxLength={200} placeholder={i === 0 ? 'Prophase: chromatin condenses into chromosomes' : 'Next step'} value={s}
                  onChange={(e) => setSteps(steps.map((x, k) => (k === i ? e.target.value : x)))} />
                <span className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move step ${i + 1} up`} className="rounded-lg border border-line px-2 py-1 text-xs disabled:opacity-30">▲</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label={`Move step ${i + 1} down`} className="rounded-lg border border-line px-2 py-1 text-xs disabled:opacity-30">▼</button>
                  {steps.length > limits.min && <button type="button" onClick={() => setSteps(steps.filter((_, k) => k !== i))} aria-label={`Remove step ${i + 1}`} className="rounded-lg px-2 py-1 text-xs text-bad">✕</button>}
                </span>
              </li>
            ))}
          </ol>
          {steps.length < limits.max && <button type="button" onClick={() => setSteps([...steps, ''])} className="mt-3 w-full rounded-2xl border border-dashed border-line py-2 font-bold text-info hover:bg-hover">+ Add a step</button>}
          <p className="mt-2 text-xs text-muted">Tip: add a short description to each step (&ldquo;Metaphase: chromosomes line up&rdquo;) so students learn what happens, not just the names.</p>
        </Panel>

        <Panel className="space-y-3">
          <input className={field} maxLength={80} placeholder="Your name (so reviewers can follow up)" value={name} onChange={(e) => setName(e.target.value)} required />
          <textarea className={field} rows={2} maxLength={500} placeholder="Note for the reviewer (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button className="w-full" disabled={busy || filled.length < limits.min || !subject.trim() || !topic.trim() || !title.trim() || !name.trim()}>
            {busy ? 'Sending…' : 'Send for review'}
          </Button>
          {error && <p className="font-bold text-bad">{error}</p>}
        </Panel>
      </form>
    </main>
  )
}
