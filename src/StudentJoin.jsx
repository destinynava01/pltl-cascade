import { useCallback, useEffect, useRef, useState } from 'react'
import { casPlay, watchGame } from './api'
import { playCollapse, playComplete, playPlace } from './sounds'
import { Button, CenterCard, Label } from './ui'
import MathText from './MathText'

const STORAGE_KEY = 'cascadeStudent'
const DEVICE_KEY = 'cascadeDevice'
const field = 'w-full rounded-2xl border border-line bg-panel px-4 py-3 text-center text-xl font-bold text-ink outline-none focus:border-accent'

function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id) }
    return id
  } catch {
    return crypto.randomUUID()
  }
}
const readSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null } }
const writeSaved = (v) => { try { v ? localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) : localStorage.removeItem(STORAGE_KEY) } catch { /* blocked */ } }

// The phone: join, wait for a team, then hold your cards and play them when it's their turn in the sequence.
export default function StudentJoin() {
  const [saved, setSaved] = useState(readSaved)
  const [notice, setNotice] = useState('')
  const leave = useCallback((message = '') => { writeSaved(null); setSaved(null); setNotice(message) }, [])
  return saved ? <Room saved={saved} onLeave={leave} /> : <JoinForm notice={notice} onJoined={(v) => { writeSaved(v); setSaved(v); setNotice('') }} />
}

function JoinForm({ onJoined, notice }) {
  const [code, setCode] = useState(() => (new URLSearchParams(window.location.search).get('code') ?? '').toUpperCase())
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function join(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const d = await casPlay({ action: 'join', join_code: code, display_name: name, device_id: deviceId() })
      onJoined({ playerId: d.player.id, gameId: d.game.id })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <CenterCard title="Cascade">
      <p className="mt-2 text-muted">Join your team&apos;s chain.</p>
      <form onSubmit={join} className="mt-4 space-y-4">
        {notice && <p className="font-bold text-muted">{notice}</p>}
        <div>
          <Label>Game code</Label>
          <input className={`${field} mt-2 uppercase tracking-[0.4em]`} maxLength={6} placeholder="ABC123" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required autoCapitalize="characters" autoComplete="off" />
        </div>
        <div>
          <Label>Your name</Label>
          <input className={`${field} mt-2`} maxLength={40} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <Button className="w-full" disabled={busy || code.length < 6 || !name.trim()}>{busy ? 'Joining…' : 'Join'}</Button>
        {error && <p className="font-bold text-bad">{error}</p>}
      </form>
    </CenterCard>
  )
}

function Room({ saved, onLeave }) {
  const [view, setView] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(null) // { kind: 'right' | 'wrong' | 'done' | 'info', text, at }
  const lastCollapse = useRef(null)
  const stamp = useRef(0) // a new number for each message, so the animation replays
  const lastChain = useRef(null) // `${run}:${cards played}` last time, to hear the chain grow or finish
  const ownCollapse = useRef(false) // this phone caused the collapse (it already showed what was next)
  const say = (kind, text) => { stamp.current += 1; setFlash({ kind, text, at: stamp.current }) }

  const check = useCallback(() => casPlay({ action: 'status', player_id: saved.playerId, device_id: deviceId() })
    .then((d) => {
      if (d.ended) return onLeave('That game has ended. Join another with a new code.')
      // Someone on the team collapsed the chain: tell everyone
      const c = d.run?.last_collapse
      const collapsed = c && lastCollapse.current && c.at !== lastCollapse.current
      if (collapsed) {
        playCollapse()
        if (!ownCollapse.current) say('wrong', `💥 ${c.by} played a card out of order. New cards, start over!`)
      }
      ownCollapse.current = false
      lastCollapse.current = c?.at ?? lastCollapse.current ?? 'none'
      // A card played (by anyone on the team) or a sequence finished
      const key = d.run ? `${d.run.run_no}:${d.run.chain.length}` : null
      if (!collapsed && key && lastChain.current && key !== lastChain.current) {
        const [run] = lastChain.current.split(':').map(Number)
        if (d.run.run_no > run) playComplete()
        else if (d.run.chain.length > Number(lastChain.current.split(':')[1])) playPlace()
      }
      lastChain.current = key
      setView(d)
      setError('')
    })
    .catch((e) => {
      if (/not found|another phone/i.test(e.message)) return onLeave('You were removed from that game.')
      setError(e.message)
    }), [saved, onLeave])

  useEffect(() => {
    check()
    return watchGame(saved.gameId, ['state', 'lobby'], check, 4000)
  }, [saved, check])

  async function play(card) {
    setBusy(true)
    setError('')
    try {
      const r = await casPlay({ action: 'play', player_id: saved.playerId, device_id: deviceId(), card: card.id })
      if (r.finished) say('done', `🎉 Sequence complete! +${r.points}. Here comes the next one.`)
      else if (r.correct) say('right', '✅ Nice, that was next!')
      else {
        ownCollapse.current = true // the status check plays the crash; this message says what was next
        say('wrong', `💥 Not yet! The next step was: "${r.expected_text}". New cards, start over.`)
      }
      await check()
    } catch (e) {
      setError(e.message)
      check()
    } finally {
      setBusy(false)
    }
  }

  if (!view) return <CenterCard title="Cascade"><p className="mt-4 text-muted">{error || 'Connecting…'}</p></CenterCard>
  const { player, teams, run, score } = view
  const myTeam = teams[player.team_index]
  let body

  if (player.approval_status !== 'approved') body = <Note title="Almost in!" text="Your leader will put you on a team in a moment." />
  else if (view.game.status === 'setup') body = <Note title={`You're on ${myTeam?.name ?? 'a team'}`} text="Get ready: the game starts soon." />
  else if (view.game.status === 'finished') body = <Note title="Game over!" text={`${myTeam?.name}: ${score?.points ?? 0} points · ${score?.completed ?? 0} sequences · ${score?.resets ?? 0} collapses.`} />
  else if (!run) body = <Note title="Waiting for a sequence…" text="" />
  else if (run.all_done) body = <Note title="🎉 Every sequence done!" text="Your team finished them all. Nice flow." />
  else {
    body = (
      <>
        <section className="soft-shadow rounded-3xl border border-line bg-card p-4">
          <Label>{run.topic}</Label>
          <h2 className="font-display text-xl font-bold">{run.title}</h2>
          <p className="mt-1 text-sm text-muted">Step {run.chain.length + 1} of {run.total} is next · {run.resets} collapse{run.resets === 1 ? '' : 's'}</p>
          {run.chain.length > 0 && (
            <ol className="mt-3 space-y-1">
              {run.chain.map((step, i) => (
                <li key={i} className="flex gap-2 rounded-xl bg-accent-soft px-3 py-1.5 text-sm"><span className="font-display font-bold text-accent">{i + 1}</span><MathText text={step} /></li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <Label>Your cards (only you can see these)</Label>
          {run.my_cards.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-dashed border-line p-4 text-center text-muted">You have no cards in this round. Help your team figure out the order!</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {run.my_cards.map((card) => (
                <li key={card.id}>
                  <button type="button" disabled={busy} onClick={() => play(card)}
                    className="w-full rounded-2xl border-2 border-gold bg-gold-soft p-4 text-left transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50">
                    <span className="block text-lg font-semibold"><MathText text={card.text} /></span>
                    <span className="mt-1 block font-display text-xs font-bold uppercase tracking-widest text-gold">Tap to play this card</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-center text-xs text-muted">Only play when you&apos;re sure it&apos;s next. A wrong card re-deals everyone&apos;s cards and the team starts over.</p>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-3 text-sm">
          <p className="font-bold">Who has cards</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {run.hands.map((h) => <li key={h.name} className="rounded-full bg-card px-3 py-1">{h.name}: {h.cards}</li>)}
          </ul>
        </section>
      </>
    )
  }

  return (
    <main className="water-bg min-h-dvh text-ink">
      <div className="mx-auto max-w-md space-y-4 p-4">
        <header className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold">{player.display_name}</p>
            {myTeam && <p className="text-sm text-muted"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: myTeam.color }} />{myTeam.name}</p>}
          </div>
          {score && <p className="text-right"><span className="font-display text-2xl font-extrabold text-accent">{score.points}</span> <span className="text-sm text-muted">pts</span></p>}
        </header>
        {flash && (
          <p key={flash.at} className={`land rounded-2xl px-4 py-3 font-semibold ${flash.kind === 'wrong' ? 'collapse bg-bad-soft text-bad' : flash.kind === 'done' ? 'bg-ok-soft text-ok' : 'bg-accent-soft text-accent'}`}>{flash.text}</p>
        )}
        {body}
        {error && <p className="text-center font-bold text-bad">{error}</p>}
        <p className="text-center"><button onClick={() => onLeave()} className="text-sm text-muted hover:text-ink">Leave game</button></p>
      </div>
    </main>
  )
}

function Note({ title, text }) {
  return (
    <section className="soft-shadow rounded-3xl border border-line bg-card p-6 text-center">
      <h2 className="font-display text-2xl font-bold text-accent">{title}</h2>
      {text && <p className="mt-2 text-muted">{text}</p>}
    </section>
  )
}
