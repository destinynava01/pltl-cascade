/* eslint-disable react-refresh/only-export-components -- static slide content with small local helpers */
// The "How to play" slides for Cascade (shown on the projector when the game starts)

function Card({ children, faint }) {
  return <p className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${faint ? 'border-dashed border-slate-500 text-slate-400' : 'border-amber-300 bg-amber-300/15'}`}>{children}</p>
}

export const SLIDES = [
  {
    title: 'Everyone gets cards',
    text: 'Each team gets a process, like the phases of mitosis. Its steps are dealt to the team\'s phones as cards, and each phone shows only its own cards.',
    art: (
      <div className="flex gap-3">
        {[['Maria', ['Anaphase', 'Prophase']], ['José', ['Telophase']], ['Ana', ['Metaphase', 'Cytokinesis']]].map(([n, cards]) => (
          <div key={n} className="w-36 rounded-[1.4rem] border-4 border-slate-600 bg-[#0c2a40] p-2">
            <p className="text-center text-xs font-bold text-slate-300">{n}</p>
            <div className="mt-1 space-y-1">{cards.map((c) => <Card key={c}>{c}</Card>)}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Talk it out',
    text: 'Nobody can see anyone else\'s cards, so say what you have out loud and work out the order together. Who goes first?',
    art: (
      <div className="w-72 space-y-2 text-lg">
        <p className="rounded-2xl rounded-bl-none bg-white/10 px-4 py-2">&ldquo;I have Prophase, that&apos;s first!&rdquo;</p>
        <p className="ml-8 rounded-2xl rounded-br-none bg-teal-500/25 px-4 py-2">&ldquo;Then my Metaphase?&rdquo;</p>
        <p className="rounded-2xl rounded-bl-none bg-white/10 px-4 py-2">&ldquo;Wait, Prometaphase comes before that.&rdquo;</p>
      </div>
    ),
  },
  {
    title: 'Play the next step',
    text: 'Whoever holds the next step taps it to play it. The chain grows on the projector and on everyone\'s phone.',
    art: (
      <div className="w-72 space-y-1.5">
        <p className="rounded-xl bg-teal-500/25 px-3 py-1.5"><b className="text-teal-300">1</b> Prophase</p>
        <p className="ml-2 rounded-xl bg-teal-500/25 px-3 py-1.5"><b className="text-teal-300">2</b> Prometaphase</p>
        <p className="ml-4 rounded-xl border-2 border-dashed border-teal-300 px-3 py-1.5 text-teal-200">Step 3: who has it?</p>
      </div>
    ),
  },
  {
    title: 'Wrong card? It all collapses',
    text: 'Play a card out of order and the whole chain comes crashing down: everyone gets new cards and the team starts that sequence over.',
    art: (
      <div className="text-center">
        <p className="text-6xl">💥</p>
        <p className="mt-2 rounded-xl bg-red-500/20 px-4 py-2 text-lg font-bold text-red-300">Not yet! New cards, start over.</p>
      </div>
    ),
  },
  {
    title: 'Finish for points',
    text: 'A finished sequence earns 100 points, minus 15 for each collapse, and the next sequence comes in. The team with the most points wins.',
    art: (
      <div className="space-y-2 text-lg font-black">
        <p className="rounded-xl bg-green-500/20 px-4 py-2 text-green-300">🎉 Sequence done · +100</p>
        <p className="rounded-xl bg-white/10 px-4 py-2 text-slate-200">1 collapse · +85</p>
        <p className="rounded-xl bg-white/10 px-4 py-2 text-slate-200">🌊 Next sequence…</p>
      </div>
    ),
  },
]
