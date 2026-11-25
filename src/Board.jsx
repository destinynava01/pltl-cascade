import { useCallback, useEffect, useRef, useState } from 'react'
import HowToPlay from './HowToPlay'
import { SLIDES as HOW_TO_SLIDES } from './howToSlides'
import { casGame, watchGame } from './api'
import Results from './Results'
import { SITE_NAME } from './config'
import { Button, Label } from './ui'
import { playCollapse, playComplete, playPlace, setSoundOn, soundOn } from './sounds'

// The projector: every team's chain as it grows, card by card. A collapse shakes the team's column and shows who
// played what. Teams that finish a sequence get the next one automatically.
export default function Board({ session, onLobby, onNewGame }) {
  const [board, setBoard] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const call = useCallback((payload) => casGame({ ...payload, game_id: session.gameId, host_token: session.hostToken }), [session])
  const [sound, setSound] = useState(soundOn)
  const last = useRef(null) // each team's chain the last time we looked, to hear what changed

  // One sound per update, the biggest news first: a collapse, then a finished sequence, then a card played
  const listen = (d) => {
    const now = new Map(d.teams.map((t) => [t.index, { collapse: t.run?.last_collapse?.at ?? null, run: t.run?.run_no ?? 0, chain: t.run?.chain.length ?? 0 }]))
    if (last.current) {
      let collapse = false
      let complete = false
      let place = false
      for (const [i, n] of now) {
        const before = last.current.get(i)
        if (!before) continue
        if (n.collapse && n.collapse !== before.collapse) collapse = true
        else if (n.run > before.run) complete = true
        else if (n.run === before.run && n.chain > before.chain) place = true
      }
      if (collapse) playCollapse()
      else if (complete) playComplete()
      else if (place) playPlace()
    }
    last.current = now
  }

  const load = useCallback(() => call({ action: 'board' }).then((d) => { listen(d); setBoard(d); setError('') }).catch((e) => setError(e.message)), [call])
  useEffect(() => {
    load()
    return watchGame(session.gameId, ['state', 'lobby'], load, 5000)
  }, [session, load])

  async function act(payload, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(true)
    try { await call(payload); await load() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  if (!board) return <main className="water-bg flex min-h-dvh items-center justify-center"><p className="text-muted">{error || 'Filling the river…'}</p></main>
  if (board.game.status === 'finished') return <Results session={session} onNewGame={onNewGame} onLobby={onLobby} />

  return (
    <main className="water-bg min-h-dvh p-4 text-ink sm:p-6">
      {/* The visual how-to guide: opens once per game, skippable */}
      <HowToPlay site="cascade" gameId={session.gameId} name="Cascade" accent="#3ee0d0" slides={HOW_TO_SLIDES} />
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-sm uppercase tracking-[0.3em] text-info">{SITE_NAME} · join code {session.joinCode}</p>
          <h1 className="font-display text-3xl font-extrabold text-accent">🌊 {board.game.subject}</h1>
          <p className="text-sm text-muted">{board.game.topics.join(' · ')} · {board.game.sequences} sequences</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {board.waiting > 0 && <Button variant="gold" className="!px-4 !py-2 text-sm" onClick={onLobby}>{board.waiting} waiting to join</Button>}
          <Button variant="outline" className="!px-4 !py-2 text-sm" aria-label={sound ? 'Mute sounds' : 'Turn sounds on'} title={sound ? 'Mute sounds' : 'Turn sounds on'}
            onClick={() => { setSoundOn(!sound); setSound(!sound); if (!sound) playPlace() }}>
            {sound ? '🔊' : '🔇'}
          </Button>
          <Button variant="outline" className="!px-4 !py-2 text-sm" onClick={onLobby}>Lobby</Button>
          <Button variant="danger" className="!px-4 !py-2 text-sm" disabled={busy} onClick={() => act({ action: 'end_game' }, 'End the game and see the results?')}>End game</Button>
        </div>
      </header>
      {error && <p className="mx-auto mt-3 max-w-7xl font-bold text-bad">{error}</p>}

      <section className="mx-auto mt-6 grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-3">
        {board.teams.map((t) => <TeamColumn key={t.index} team={t} serverNow={Date.parse(board.server_now)} busy={busy} onSkip={() => act({ action: 'skip_sequence', team_index: t.index }, `Skip ${t.name}'s current sequence? It scores 0 and they get the next one.`)} />)}
      </section>
    </main>
  )
}

function TeamColumn({ team, serverNow, busy, onSkip }) {
  const r = team.run
  // Shake the column right after a collapse (by the server's clock, from the last update)
  const collapsedRecently = r?.last_collapse && serverNow - Date.parse(r.last_collapse.at) < 8000
  return (
    <article className={`soft-shadow overflow-hidden rounded-3xl border border-line bg-card ${collapsedRecently ? 'collapse' : ''}`} key={r?.last_collapse?.at ?? 'team'}>
      <div className="flex items-center justify-between gap-2 px-5 py-3" style={{ borderBottom: `3px solid ${team.color}` }}>
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-bold">{team.name}</h2>
          <p className="truncate text-sm text-muted">{team.members.join(', ')}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-extrabold text-accent">{team.score.points}</p>
          <p className="text-sm text-muted">{team.score.completed} done · {team.score.resets} collapse{team.score.resets === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="p-5">
        {!r && <p className="text-muted">Waiting for a sequence…</p>}
        {r && team.all_done && <p className="text-center font-display text-xl font-bold text-ok">🎉 Every sequence done!</p>}
        {r && !team.all_done && (
          <>
            <Label>{r.topic}</Label>
            <p className="font-display text-lg font-bold">{r.title}</p>
            <ol className="mt-3 space-y-1.5">
              {r.chain.map((step, i) => (
                <li key={`${r.run_no}-${i}`} className="land flex gap-2 rounded-xl border border-accent/40 bg-accent-soft px-3 py-1.5 text-sm" style={{ marginLeft: `${Math.min(i, 6) * 6}px` }}>
                  <span className="font-display font-bold text-accent">{i + 1}</span><span>{step}</span>
                </li>
              ))}
              {Array.from({ length: r.total - r.chain.length }, (_, i) => (
                <li key={`empty-${i}`} className={`rounded-xl border border-dashed border-line px-3 py-1.5 text-sm text-muted ${i === 0 ? 'ripple' : ''}`} style={{ marginLeft: `${Math.min(r.chain.length + i, 6) * 6}px` }}>
                  {i === 0 ? `Step ${r.chain.length + 1}: who has it?` : '·'}
                </li>
              ))}
            </ol>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted">{r.resets} collapse{r.resets === 1 ? '' : 's'} on this one</span>
              <button type="button" disabled={busy} onClick={onSkip} className="font-bold text-info hover:underline">Stuck? Skip it →</button>
            </div>
            {r.last_collapse && (
              <p className="mt-2 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">💥 Collapsed: {r.last_collapse.by} played step {r.last_collapse.step + 1} when step {r.last_collapse.expected + 1} was next.</p>
            )}
          </>
        )}
      </div>
    </article>
  )
}
