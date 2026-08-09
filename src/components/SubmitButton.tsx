import type { ButtonHTMLAttributes } from 'react'

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pending?: boolean
  pendingLabel?: string
}

export function SubmitButton({
  children,
  pending = false,
  pendingLabel = 'Arbeider …',
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <button
      {...props}
      className="button button--primary button--full"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  )
}
