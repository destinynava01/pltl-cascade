// The results as a spreadsheet: Teams, Sequences (each one a team played, with the collapses), and Students.
// The Excel library loads only when someone downloads.
export async function downloadResults(report) {
  const XLSX = await import('xlsx')
  const book = XLSX.utils.book_new()
  const add = (name, rows, widths) => {
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: 'Nothing to show.' }])
    sheet['!cols'] = widths.map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(book, sheet, name)
  }
  add('Teams', [...report.teams].sort((a, b) => b.score.points - a.score.points).map((t, i) => ({
    Place: i + 1, Team: t.name, Points: t.score.points, 'Sequences done': t.score.completed, Collapses: t.score.resets,
  })), [6, 20, 8, 15, 10])
  add('Sequences', report.teams.flatMap((t) => t.runs.map((r) => ({
    Team: t.name, Topic: r.topic, Sequence: r.title, Finished: r.status === 'done' ? 'Yes' : 'No', Collapses: r.resets, Points: r.points,
    'Where it collapsed': r.slips.map((s) => `${s.by} played "${s.played}" when "${s.expected}" was next`).join('\n'),
    'Right order': r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
  }))), [16, 22, 30, 9, 10, 7, 70, 70])
  add('Students', report.students, [22, 16, 13, 8, 22])
  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(book, `Cascade-results-${today}.xlsx`)
}
