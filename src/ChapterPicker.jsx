// Tick the chapters a sequence fits: course > professor > chapter (from the shared question bank). One sequence can
// fit several professors' chapters, like mitosis in Carreon's Ch 11 and Ermolinsky's Ch 10.
export default function ChapterPicker({ courses, value, onChange }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  return (
    <div className="space-y-3">
      {courses.map((course) => {
        const picked = course.professors.flatMap((p) => p.chapters).filter((ch) => value.includes(ch.id)).length
        return (
          <details key={course.course_name} open={courses.length === 1 || picked > 0} className="rounded-2xl border border-line bg-panel">
            <summary className="cursor-pointer px-3 py-2 font-display font-bold">
              {course.course_name} {picked > 0 && <span className="text-sm font-normal text-accent">({picked} chosen)</span>}
            </summary>
            <div className="space-y-3 px-3 pb-3">
              {course.professors.length === 0 && <p className="text-sm text-muted">No chapters yet.</p>}
              {course.professors.map((p) => (
                <div key={p.professor_name}>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{p.professor_name}</p>
                  <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                    {p.chapters.map((ch) => {
                      const on = value.includes(ch.id)
                      return (
                        <li key={ch.id}>
                          <label className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2 py-1.5 text-sm ${on ? 'border-accent bg-accent-soft' : 'border-line hover:bg-hover'}`}>
                            <input type="checkbox" checked={on} onChange={() => toggle(ch.id)} className="h-4 w-4 accent-teal-400" />
                            <span>{ch.topic_name}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}

