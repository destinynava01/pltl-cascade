import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { casGame, watchGame } from './api'
import { HUB_URL, MAX_TEAMS, MIN_TEAMS, SITE_NAME, TEAM_COLORS } from './config'
import { saveSession } from './session'
import { Button, Label, Panel } from './ui'

const choice = (on) =>
  `rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-panel hover:bg-hover'}`

// Leader lobby: create the game -> teams -> finalize -> course, professor and chapters (or, for subjects with no
// chapters yet, a subject and topics) -> start.
// Students join from their phones; the leader puts them on teams. A team of one works.
export default function Lobby({ onStart, onOpenBoard, hasGame, resume, onCloseGame }) {
  const [session, setSession] = useState(resume?.session ?? null)
  const [teamNames, setTeamNames] = useState(resume?.teams?.length ? resume.teams : ['Team 1', 'Team 2'])
  const [finalized, setFinalized] = useState(Boolean(resume?.finalized))
  const [catalog, setCatalog] = useState(null)
  const [course, setCourse] = useState('')
  const [professor, setProfessor] = useState('')
  const [topicIds, setTopicIds] = useState([])
  const [subject, setSubject] = useState('')
  const [topics, setTopics] = useState([])
  const [players, setPlayers] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { casGame({ action: 'catalog' }).then(setCatalog).catch((e) => setError(e.message)) }, [])
  useEffect(() => {
    if (!session) return undefined
    const load = () => casGame({ action: 'list_players', game_id: session.gameId, host_token: session.hostToken }).then((d) => setPlayers(d.players)).catch(() => {})
    load()
    return watchGame(session.gameId, ['lobby'], load, 10000)
  }, [session])

  const call = (payload) => casGame({ ...payload, game_id: session.gameId, host_token: session.hostToken })
  const run = async (fn) => {
    setBusy(true)
    setError('')
    try { await fn() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const teamLabel = (i) => teamNames[i].trim() || `Team ${i + 1}`
  const waiting = players.filter((p) => p.approval_status === 'pending')
  const sizes = teamNames.map((_, i) => players.filter((p) => p.approval_status === 'approved' && p.team_index === i).length)
  const emptyTeams = teamNames.map((_, i) => i).filter((i) => sizes[i] === 0)
  const subjectTopics = catalog?.subjects.find((s) => s.subject === subject)?.topics ?? []
  const professors = catalog?.courses.find((c) => c.course_name === course)?.professors ?? []
  const chapters = professors.find((p) => p.professor_name === professor)?.chapters ?? []
  // One sequence can sit under several chosen chapters, so this is an upper bound ("up to")
  const sequenceCount = course
    ? chapters.filter((ch) => topicIds.includes(ch.id)).reduce((n, ch) => n + ch.count, 0)
    : subjectTopics.filter((t) => topics.includes(t.topic)).reduce((n, t) => n + t.count, 0)
  const picked = course ? topicIds.length : topics.length
  const nothing = catalog && catalog.courses.length === 0 && catalog.subjects.length === 0
  const pickProfessor = (p) => { setProfessor(p.professor_name); setTopicIds(p.chapters.map((ch) => ch.id)) }
  const pickCourse = (c) => {
    setCourse(c.course_name); setSubject(''); setTopics([])
    if (c.professors.length === 1) pickProfessor(c.professors[0])
    else { setProfessor(''); setTopicIds([]) }
  }
  const pickSubject = (s) => { setSubject(s.subject); setTopics(s.topics.map((t) => t.topic)); setCourse(''); setProfessor(''); setTopicIds([]) }

  const create = () => run(async () => {
    const d = await casGame({ action: 'create_game' })
    const s = { gameId: d.game.id, hostToken: d.host_token, joinCode: d.game.join_code }
    saveSession(s)
    setSession(s)
  })
  const finalize = () => run(async () => { await call({ action: 'set_teams', team_names: teamNames.map((_, i) => teamLabel(i)) }); setFinalized(true) })
  const studentAction = (payload) => run(async () => { await call(payload); setPlayers((await call({ action: 'list_players' })).players) })
  const start = () => run(async () => {
    await call({ action: 'start_game', team_names: teamNames.map((_, i) => teamLabel(i)), ...(course ? { course_name: course, professor_name: professor, topic_ids: topicIds } : { subject, topics }) })
    onStart(session)
  })

  const joinUrl = session ? `${window.location.origin}/join?code=${session.joinCode}` : ''

  return (
    <main className="water-bg min-h-dvh p-4 text-ink sm:p-8">
      {hasGame && <button onClick={onOpenBoard} className="fixed right-4 top-4 z-20 rounded-2xl border border-line bg-panel px-4 py-2 font-bold hover:bg-hover">Back to the game</button>}

      <header className="mx-auto mb-8 max-w-5xl text-center">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-info">{SITE_NAME}</p>
        <h1 className="mt-1 font-display text-5xl font-extrabold text-accent">Leader Lobby</h1>
        <p className="mt-2 text-muted">Set up the teams, pick the sequences, then let it flow.</p>
        <p className="mt-2 text-sm font-bold">
          <a href={HUB_URL} className="text-info hover:underline">← All games</a>
          <span className="mx-2 text-muted">·</span><a href="/submit" className="text-info hover:underline">Submit sequences</a>
          <span className="mx-2 text-muted">·</span><a href="/review" className="text-info hover:underline">Review queue</a>
        </p>
        <div className="mt-6">
          {session ? (
            <div className="flex flex-col items-center gap-3">
              <p className="font-bold text-ok">Game ready!</p>
              <Button variant="outline" className="!px-4 !py-2 text-sm" disabled={busy} onClick={() => window.confirm('Close this game? Every student will be sent back to the join page.') && onCloseGame()}>Close game and start fresh</Button>
            </div>
          ) : <Button onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create new game'}</Button>}
          {error && <p className="mt-3 font-bold text-bad">{error}</p>}
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        <Panel>
          <h2 className="font-display text-2xl font-bold text-accent">Join</h2>
          <p className="mt-3">Join code: {session ? <span className="font-display text-3xl font-extrabold tracking-widest text-gold">{session.joinCode}</span> : <span className="text-muted">Not created yet</span>}</p>
          {session && (
            <div className="mt-5 flex flex-col items-center">
              <div className="rounded-2xl bg-white p-4"><QRCodeSVG value={joinUrl} size={200} title={`Join code ${session.joinCode}`} /></div>
              <p className="mt-3 text-center text-sm text-muted">Students scan this with their phone camera to join.</p>
            </div>
          )}
          <div className="mt-6 rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
            <p className="font-bold text-ink">How it flows</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Each team gets a sequence (like the phases of mitosis). Its steps are dealt to the team&apos;s phones, and only you see your own cards.</li>
              <li>The team talks it out, and whoever holds the next step plays it.</li>
              <li>A wrong card collapses the chain: the cards are re-dealt and the team starts over.</li>
            </ol>
          </div>
        </Panel>

        <Panel>
          <h2 className="font-display text-2xl font-bold text-accent">Teams</h2>
          <div className="mt-4 space-y-2">
            {teamNames.map((name, i) => (
              <div key={i} className="flex items-center gap-3 overflow-hidden rounded-2xl border border-line bg-panel">
                <span className="self-stretch w-2" style={{ background: TEAM_COLORS[i] }} aria-hidden="true" />
                <input className="min-w-0 flex-1 bg-transparent py-2.5 font-display text-lg font-bold outline-none" value={name} maxLength={40} disabled={finalized}
                  aria-label={`Name for team ${i + 1}`} onChange={(e) => setTeamNames(teamNames.map((n, k) => (k === i ? e.target.value : n)))} />
                {finalized && <span className="pr-3 text-sm text-muted">{sizes[i]} student{sizes[i] === 1 ? '' : 's'}</span>}
                {!finalized && teamNames.length > MIN_TEAMS && (
                  <button type="button" onClick={() => setTeamNames(teamNames.filter((_, k) => k !== i))} aria-label={`Remove team ${i + 1}`} className="mr-3 px-2 text-muted hover:text-bad">✕</button>
                )}
              </div>
            ))}
          </div>
          {!finalized && teamNames.length < MAX_TEAMS && <Button variant="outline" className="mt-3 w-full" onClick={() => setTeamNames([...teamNames, `Team ${teamNames.length + 1}`])}>+ Add team ({teamNames.length}/{MAX_TEAMS})</Button>}
          <p className="mt-2 text-xs text-muted">Teams of 3 to 6 work best. Every team needs at least one student; with fewer students than steps, some hold two cards.</p>
          <Button className="mt-4 w-full" disabled={!session || finalized || busy} onClick={finalize}>{finalized ? 'Teams finalized' : 'Finalize teams'}</Button>
          {finalized && <button type="button" className="mt-2 text-sm font-bold text-info" onClick={() => setFinalized(false)}>Edit teams</button>}

          {finalized && (
            <div className="mt-6 border-t border-line pt-4">
              {!catalog && <p className="text-muted">Loading sequences…</p>}
              {nothing && <p className="text-muted">No approved sequences yet. Add some on the Submit page.</p>}
              {catalog && !nothing && (
                <>
                  <Label>1. Course</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {catalog.courses.map((c) => (
                      <button key={c.course_name} type="button" className={choice(course === c.course_name)} onClick={() => pickCourse(c)}>{c.course_name}</button>
                    ))}
                    {catalog.subjects.map((s) => (
                      <button key={s.subject} type="button" className={choice(subject === s.subject)} onClick={() => pickSubject(s)}>
                        {s.subject}{catalog.courses.some((c) => c.course_name === s.subject) && <span className="block text-xs font-normal text-muted">not filed by chapter yet</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {course && professors.length > 1 && (
                <>
                  <Label className="mt-4">2. Professor</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {professors.map((p) => <button key={p.professor_name} type="button" className={choice(professor === p.professor_name)} onClick={() => pickProfessor(p)}>{p.professor_name}</button>)}
                  </div>
                </>
              )}
              {((course && professor) || subject) && (
                <>
                  <div className="mt-4 flex items-baseline justify-between">
                    <Label>{course ? (professors.length > 1 ? '3. Chapters' : '2. Chapters') : '2. Topics'}</Label>
                    <span className="flex gap-3 text-xs font-bold">
                      <button type="button" className="text-info" onClick={() => (course ? setTopicIds(chapters.map((ch) => ch.id)) : setTopics(subjectTopics.map((t) => t.topic)))}>All</button>
                      <button type="button" className="text-info" onClick={() => (course ? setTopicIds([]) : setTopics([]))}>None</button>
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {(course ? chapters.map((ch) => ({ key: ch.id, name: ch.topic_name, count: ch.count })) : subjectTopics.map((t) => ({ key: t.topic, name: t.topic, count: t.count }))).map((t) => {
                      const list = course ? topicIds : topics
                      const set = course ? setTopicIds : setTopics
                      const on = list.includes(t.key)
                      return (
                        <li key={t.key}>
                          <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-sm ${on ? 'border-accent bg-accent-soft' : 'border-line bg-panel hover:bg-hover'}`}>
                            <input type="checkbox" checked={on} className="h-4 w-4 accent-teal-400" onChange={() => set(on ? list.filter((x) => x !== t.key) : [...list, t.key])} />
                            <span className="flex-1 font-semibold">{t.name}</span>
                            <span className="text-xs text-muted">{t.count} sequence{t.count === 1 ? '' : 's'}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                  {emptyTeams.length > 0 && <p className="mt-3 text-sm font-bold text-bad">Every team needs at least one student. Still empty: {emptyTeams.map(teamLabel).join(', ')}.</p>}
                  <Button className="mt-4 w-full" disabled={busy || picked === 0 || emptyTeams.length > 0} onClick={start}>
                    {busy ? 'Starting…' : picked === 0 ? `Pick at least one ${course ? 'chapter' : 'topic'}` : `🌊 Start (${course && topicIds.length > 1 ? 'up to ' : ''}${sequenceCount} sequence${sequenceCount === 1 ? '' : 's'})`}
                  </Button>
                </>
              )}
            </div>
          )}
        </Panel>

        <Panel className="md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-accent">Students waiting</h2>
            <Button variant="outline" className="!px-4 !py-2 text-sm" disabled={!finalized || waiting.length === 0 || busy} onClick={() => studentAction({ action: 'assign_random' })}>🎲 Randomly assign teams ({waiting.length})</Button>
          </div>
          {!session && <p className="mt-4 text-muted">Create the game first, then students can join with the code.</p>}
          {session && !finalized && <p className="mt-4 text-muted">Finalize the teams so you can put students on them.</p>}
          {session && players.length === 0 && <p className="mt-4 text-muted">No students have joined yet.</p>}
          {waiting.length > 0 && (
            <ul className="mt-4 space-y-2">
              {waiting.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-panel px-3 py-2">
                  <span className="font-bold">{p.display_name}</span>
                  <span className="flex flex-wrap gap-2">
                    {teamNames.map((_, i) => (
                      <button key={i} type="button" disabled={!finalized || busy} onClick={() => studentAction({ action: 'approve_player', player_id: p.id, team_index: i })}
                        className="rounded-xl px-3 py-1 text-sm font-bold text-black disabled:opacity-40" style={{ background: TEAM_COLORS[i] }}>{teamLabel(i)}</button>
                    ))}
                    <button type="button" disabled={busy} onClick={() => studentAction({ action: 'remove_player', player_id: p.id })} className="rounded-xl border border-line px-3 py-1 text-sm font-bold hover:bg-hover">Remove</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {players.some((p) => p.approval_status === 'approved') && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {teamNames.map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-line bg-panel">
                  <div className="h-1.5" style={{ background: TEAM_COLORS[i] }} />
                  <div className="p-3">
                    <p className="font-display font-bold">{teamLabel(i)}</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {players.filter((p) => p.approval_status === 'approved' && p.team_index === i).map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span>{p.display_name}</span>
                          <button type="button" aria-label={`Remove ${p.display_name}`} disabled={busy} onClick={() => studentAction({ action: 'remove_player', player_id: p.id })} className="text-xs font-bold text-bad">✕</button>
                        </li>
                      ))}
                      {sizes[i] === 0 && <li className="text-xs font-bold text-bad">Needs a student</li>}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </main>
  )
}
