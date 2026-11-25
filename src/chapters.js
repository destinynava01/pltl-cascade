// "Robertson: Ch 11 Histology of Nervous Tissue" for each chapter id that still exists
export function chapterLabels(courses, ids) {
  const out = []
  for (const c of courses ?? []) {
    for (const p of c.professors) {
      for (const ch of p.chapters) if (ids?.includes(ch.id)) out.push(`${c.course_name} · ${p.professor_name}: ${ch.topic_name}`)
    }
  }
  return out
}
