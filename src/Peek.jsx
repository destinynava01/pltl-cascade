import { useEffect, useState } from 'react'
import MathText from './MathText'
import { Button, Label } from './ui'

// The leader's peek at one team: the sequence it's on, the chain so far, the cards each student is holding (sorted
// A-Z, so this screen doesn't give the order away), and every wrong card on this sequence. Which card comes next, and
// who holds it, stays behind a button, since the board is often on the projector. Refreshes whenever the board does
// (`stamp` changes).
export default function Peek({ call, team, stamp, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [shownFor, setShownFor] = useState(null) // the step the answer was shown for (the next card hides it again)

  useEffect(() => {
    call({ action: 'peek', team_index: team.index }).then((d) => { setData(d); setError('') }).catch((e) => setError(e.message))
  }, [call, team.index, stamp])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const r = data?.run
  const key = data?.next ? `${r.run_no}:${data.next.step}:${r.resets}` : null
  const showNext = key !== null && shownFor === key

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={`Peek at ${team.name}`}>
      <section className="soft-shadow my-auto w-full max-w-2xl rounded-3xl border border-line bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label>👀 Peeking at {team.name}</Label>
            {r && <h2 className="mt-1 font-display text-2xl font-bold text-accent">{r.title}</h2>}
            {r && <p className="text-sm text-muted">{r.topic} · {r.chain.length}/{r.total} cards down · {r.resets} collapse{r.resets === 1 ? '' : 's'}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-line px-3 py-1 font-bold hover:bg-hover" aria-label="Close">✕</button>
        </div>

        {error && <p className="mt-3 font-bold text-bad">{error}</p>}
        {!data && !error && <p className="mt-4 text-muted">Loading…</p>}
        {r && r.status === 'done' && <p className="mt-4 text-ok">This sequence is done; the next one is on its way.</p>}

        {r && r.status === 'playing' && (
          <>
            {r.chain.length > 0 && (
              <ol className="mt-3 space-y-1">
                {r.chain.map((step, i) => (
                  <li key={i} className="flex gap-2 rounded-xl border border-accent/40 bg-accent-soft px-3 py-1 text-sm">
                    <span className="font-display font-bold text-accent">{i + 1}</span><span><MathText text={step} /></span>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-4">
              <Label>Cards in each hand (A–Z, not in order)</Label>
              <ul className="mt-1 grid gap-2 sm:grid-cols-2">
                {data.hands.map((h) => (
                  <li key={h.name} className="rounded-xl border border-line bg-panel p-2 text-sm">
                    <p className="font-bold">{h.name} <span className="font-normal text-muted">· {h.cards.length} card{h.cards.length === 1 ? '' : 's'}</span></p>
                    {h.cards.length === 0 ? <p className="text-muted">No cards (helping out loud)</p> : (
                      <ul className="mt-1 space-y-0.5">{h.cards.map((c, i) => <li key={i}>🂠 <MathText text={c} /></li>)}</ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <Label>Wrong cards on this sequence</Label>
              {data.slips.length === 0 ? <p className="mt-1 text-sm text-muted">No collapses yet.</p> : (
                <ol className="mt-1 space-y-1">
                  {data.slips.map((s, i) => (
                    <li key={i} className="rounded-xl bg-bad-soft px-3 py-1.5 text-sm text-bad">
                      💥 <b>{s.by}</b> played &ldquo;<MathText text={s.played} />&rdquo;
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {data.next && (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="!px-3 !py-1.5 text-sm" onClick={() => setShownFor(showNext ? null : key)}>{showNext ? 'Hide' : 'Show'} the next card</Button>
                  <span className="text-xs text-muted">(hidden by default in case this is on the projector)</span>
                </div>
                {showNext && (
                  <p className="mt-2 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
                    Step {data.next.step}: <b><MathText text={data.next.card} /></b> · held by <b>{data.next.holder}</b>
                  </p>
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  )
}
