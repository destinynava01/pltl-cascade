// Shared building blocks with the waterfall look

export function CenterCard({ title, children }) {
  return (
    <main className="water-bg flex min-h-dvh items-center justify-center p-4 text-ink">
      <div className="soft-shadow w-full max-w-md rounded-3xl border border-line bg-card p-8 text-center">
        <h1 className="font-display text-4xl font-extrabold text-accent">{title}</h1>
        {children}
      </div>
    </main>
  )
}

export function Label({ children, className = '' }) {
  return <p className={`font-display text-xs font-bold uppercase tracking-[0.2em] text-info ${className}`}>{children}</p>
}

const BUTTONS = {
  primary: 'bg-accent text-on-accent hover:brightness-110',
  gold: 'bg-gold text-black hover:brightness-105',
  danger: 'bg-bad text-black hover:brightness-105',
  outline: 'border border-line bg-panel text-ink hover:bg-hover',
}

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`rounded-2xl px-6 py-3 font-display font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${BUTTONS[variant]} ${className}`}
      {...props}
    />
  )
}

export function Panel({ children, className = '' }) {
  return <section className={`soft-shadow rounded-3xl border border-line bg-card p-5 ${className}`}>{children}</section>
}
