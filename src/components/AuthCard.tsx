import type { PropsWithChildren, ReactNode } from 'react'

interface AuthCardProps extends PropsWithChildren {
  title: string
  description: string
  footer?: ReactNode
}

export function AuthCard({
  title,
  description,
  footer,
  children,
}: AuthCardProps) {
  return (
    <div className="auth-card">
      <div className="auth-card__heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
      {footer ? <div className="auth-card__footer">{footer}</div> : null}
    </div>
  )
}
