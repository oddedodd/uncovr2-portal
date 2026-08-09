import type { PropsWithChildren } from 'react'

interface FeedbackBannerProps extends PropsWithChildren {
  title: string
  tone?: 'info' | 'success' | 'error'
}

export function FeedbackBanner({
  title,
  tone = 'info',
  children,
}: FeedbackBannerProps) {
  const isError = tone === 'error'

  return (
    <section
      className={`feedback-banner feedback-banner--${tone}`}
      aria-live={isError ? 'assertive' : 'polite'}
      role={isError ? 'alert' : 'status'}
    >
      <h2>{title}</h2>
      {children ? <div>{children}</div> : null}
    </section>
  )
}
