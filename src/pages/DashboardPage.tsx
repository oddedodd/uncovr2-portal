const foundations = [
  {
    title: 'Ruting',
    description: 'Data Mode-ruter gir tydelige sidegrenser og feiltilstander.',
  },
  {
    title: 'Serverdata',
    description: 'TanStack Query håndterer henting, caching og mutasjoner.',
  },
  {
    title: 'Laravel API',
    description: 'Alle kall bruker sikre sessions, CSRF og request-ID.',
  },
]

export function DashboardPage() {
  return (
    <>
      <p className="eyebrow">Portalgrunnmur</p>
      <h1 className="page-title">Arbeidsflaten for Uncovr.</h1>
      <p className="page-intro">
        Her skal labels, artister og plattformteamet administrere katalogen uten
        at forretningsregler flyttes ut av Laravel.
      </p>
      <section className="status-grid" aria-label="Teknisk status">
        {foundations.map((foundation) => (
          <article className="status-card" key={foundation.title}>
            <h2>{foundation.title}</h2>
            <p>{foundation.description}</p>
          </article>
        ))}
      </section>
    </>
  )
}
