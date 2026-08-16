import type { MediaKind } from './media.ts'
import type {
  ReleaseContentBlock,
  ReleaseContentBlockPayload,
  ReleaseContentBlockType,
} from './releases.ts'

/**
 * Nyttelasten til en blokk avhenger av typen, og feltnavnene i skjemaet er de
 * samme som Laravel forventer. Lesing og skriving av en `payload` samles derfor
 * her, slik at skjemaet og de skrivebeskyttede visningene ikke kan komme i
 * utakt om et felt endrer navn.
 */

export const blockTypeLabels: Record<ReleaseContentBlockType, string> = {
  text: 'Tekst',
  heading: 'Overskrift',
  image: 'Bilde',
  gallery: 'Galleri',
  video: 'Video',
  quote: 'Sitat',
  lyrics: 'Lyrikk',
}

function optionalString(data: FormData, key: string): string | null {
  const value = String(data.get(key) ?? '').trim()
  return value || null
}

export function blockPayload(
  type: ReleaseContentBlockType,
  data: FormData,
): ReleaseContentBlockPayload {
  if (type === 'heading') {
    return {
      text: String(data.get('text') ?? '').trim(),
      level: Number(data.get('level') ?? 2),
    }
  }
  if (type === 'text') {
    return { body: String(data.get('body') ?? '').trim() }
  }
  if (type === 'quote') {
    return {
      text: String(data.get('text') ?? '').trim(),
      attribution: optionalString(data, 'attribution'),
    }
  }
  if (type === 'image') {
    return {
      media_id: String(data.get('media_id') ?? '').trim(),
      alt_text: String(data.get('alt_text') ?? '').trim(),
      caption: optionalString(data, 'caption'),
    }
  }
  if (type === 'gallery') {
    return {
      items: [
        {
          media_id: String(data.get('media_id') ?? '').trim(),
          alt_text: String(data.get('alt_text') ?? '').trim(),
          caption: optionalString(data, 'caption'),
        },
      ],
    }
  }
  if (type === 'video') {
    const mediaId = optionalString(data, 'media_id')
    const url = optionalString(data, 'url')
    return {
      media_id: url ? null : mediaId,
      url: mediaId ? null : url,
      caption: optionalString(data, 'caption'),
    }
  }
  return {
    text: String(data.get('text') ?? '').trim(),
    language: optionalString(data, 'language'),
  }
}

export function blockTextValue(block: ReleaseContentBlock) {
  const payload = block.payload
  if ('body' in payload && typeof payload.body === 'string') return payload.body
  if ('text' in payload && typeof payload.text === 'string') return payload.text
  return ''
}

export function blockSecondaryValue(block: ReleaseContentBlock, key: string) {
  const value = (block.payload as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

export function blockLevelValue(payload: ReleaseContentBlockPayload) {
  return 'level' in payload && typeof payload.level === 'number'
    ? payload.level
    : 2
}

export function blockMediaId(block?: ReleaseContentBlock) {
  const payload = block?.payload
  if (!payload) return ''
  if ('media_id' in payload && typeof payload.media_id === 'string') {
    return payload.media_id
  }
  if ('items' in payload && Array.isArray(payload.items)) {
    const first = payload.items[0] as Record<string, unknown> | undefined
    return typeof first?.media_id === 'string' ? first.media_id : ''
  }
  return ''
}

export function blockCaptionValue(block?: ReleaseContentBlock) {
  const payload = block?.payload
  if (!payload) return ''
  if ('caption' in payload && typeof payload.caption === 'string') {
    return payload.caption
  }
  if ('items' in payload && Array.isArray(payload.items)) {
    const first = payload.items[0] as Record<string, unknown> | undefined
    return typeof first?.caption === 'string' ? first.caption : ''
  }
  return ''
}

export function blockAltTextValue(block?: ReleaseContentBlock) {
  const payload = block?.payload
  if (!payload) return ''
  if ('alt_text' in payload && typeof payload.alt_text === 'string') {
    return payload.alt_text
  }
  if ('items' in payload && Array.isArray(payload.items)) {
    const first = payload.items[0] as Record<string, unknown> | undefined
    return typeof first?.alt_text === 'string' ? first.alt_text : ''
  }
  return ''
}

export function blockVideoUrlValue(block?: ReleaseContentBlock) {
  const payload = block?.payload
  return payload && 'url' in payload && typeof payload.url === 'string'
    ? payload.url
    : ''
}

export function mediaKindForBlock(type: ReleaseContentBlockType): MediaKind {
  return type === 'video' ? 'video' : 'image'
}
