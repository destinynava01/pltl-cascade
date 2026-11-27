import { useEffect, useState } from 'react'
import { casGame } from './api'
import { Button, Label, Panel } from './ui'
import MathText from './MathText'
import ReportProblem from './ReportProblem'

// After the game: teams ranked by points, every sequence each team played (with where the chain collapsed and
// the right order), and the results download.
export default function Results({ session, onNewGame, onLobby }) {
  const reportCall = (payload) => casGame({ ...payload, game_id: session.gameId, host_token: session.hostToken })
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => { casGame({ action: 'report', game_id: session.gameId, host_token: session.hostToken }).then(setReport).catch((e) => setError(e.message)) }, [session])

  async function download() {
    setDownloading(true)
    try {
      const { downloadResults } = await import('./gameResults')
      await downloadResults(report)
    } catch (e) {
      setError(e.message || 'Could not download the results.')
    } finally {
      setDownloading(false)
    }
  }

  if (!report) return <main className="water-bg flex min-h-dvh items-center justify-center"><p className="text-muted">{error || 'Collecting the results…'}</p></main>
  const ranked = [...report.teams].sort((a, b) => b.score.points - a.score.points)
  const medal = ['🥇', '🥈', '🥉']

  return (
    <main className="water-bg min-h-dvh p-4 text-ink sm:p-8">
      <Panel className="mx-auto max-w-4xl text-center">
        <p className="text-5xl">🌊</p>
        <h1 className="mt-2 font-display text-5xl font-extrabold text-accent">Results</h1>
        <p className="mt-1 text-muted">{report.subject} · {report.topics.join(' · ')}</p>
        <ol className="mx-auto mt-6 max-w-xl space-y-3 text-left">
          {ranked.map((t, i) => (
            <li key={t.index}>
              <button type="button" onClick={() => setOpen(open === t.index ? null : t.index)} className="w-full rounded-2xl border border-line bg-panel p-4 text-left hover:bg-hover" style={{ borderLeft: `8px solid ${t.color}` }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-2xl font-bold">{medal[i] ?? `#${i + 1}`} {t.name}</p>
                  <p className="font-display text-3xl font-extrabold text-accent">{t.score.points}</p>
                </div>
                <p className="mt-1 text-sm text-muted">{t.score.completed} sequence{t.score.completed === 1 ? '' : 's'} done · {t.score.resets} collapse{t.score.resets === 1 ? '' : 's'}</p>
                <p className="mt-1 text-sm font-bold text-info">{open === t.index ? 'Hide sequences ▲' : 'See every sequence ▼'}</p>
              </button>
              {open === t.index && (
                <ul className="mt-2 space-y-2">
                  {t.runs.map((r, k) => (
                    <li key={k} className="rounded-2xl border border-line bg-card p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display font-bold">{r.title} <span className="font-normal text-muted">({r.topic})</span></p>
                        <p className={`shrink-0 font-bold ${r.status === 'done' ? 'text-ok' : 'text-muted'}`}>{r.status === 'done' ? `+${r.points}` : 'unfinished'}</p>
                      </div>
                      <Label className="mt-2">The right order</Label>
                      <ol className="mt-1 list-decimal space-y-0.5 pl-5">{r.steps.map((s) => <li key={s}><MathText text={s} /></li>)}</ol>
                      {r.slips.length > 0 && (
                        <>
                          <Label className="mt-2 !text-bad">Where the chain collapsed</Label>
                          <ul className="mt-1 space-y-0.5 text-bad">{r.slips.map((s, n) => <li key={n}>💥 {s.by} played &ldquo;{s.played}&rdquo; when &ldquo;{s.expected}&rdquo; was next</li>)}</ul>
                        </>
                      )}
                      <ReportProblem call={reportCall} location={`${t.name} · Sequence: ${r.title} (${r.topic})`} answer={r.steps.map((s, n) => `${n + 1}. ${s}`).join('\n')} className="mt-2" />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
        <div className="mx-auto mt-8 grid max-w-md gap-2 sm:grid-cols-2">
          <Button variant="gold" disabled={downloading} onClick={download}>{downloading ? 'Preparing…' : '⬇️ Results (.xlsx)'}</Button>
          <Button onClick={onNewGame}>New game</Button>
        </div>
        <p className="mt-2 text-sm text-muted">Download before starting a new game. New game closes this one, and game data is cleared after 8 hours.</p>
        <button type="button" onClick={onLobby} className="mt-2 text-sm font-bold text-info">Back to the lobby</button>
        {error && <p className="mt-2 font-bold text-bad">{error}</p>}
      </Panel>
    </main>
  )
}
