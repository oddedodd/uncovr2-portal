export function MediaThumbnail({
  url,
  alt,
  variant = 'square',
}: {
  url?: string
  alt: string
  variant?: 'square' | 'cover'
}) {
  return (
    <div className={`media-thumbnail media-thumbnail--${variant}`}>
      {url ? <img alt={alt} src={url} /> : <span aria-hidden="true">♪</span>}
    </div>
  )
}
