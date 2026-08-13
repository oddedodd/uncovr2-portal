import { queryOptions } from '@tanstack/react-query'
import { apiRequest } from './api.ts'

export type MediaOwnerType = 'organization' | 'artist'

export interface MediaReference {
  id: string
  status: 'ready'
  mime_type: string
  width: number | null
  height: number | null
}

interface MediaUpload {
  id: string
  method: 'PUT'
  url: string
  mime_type: string
  maximum_byte_size: number
}

interface MediaDownloads {
  expires_in: number
  items: Array<{ media_id: string; url: string }>
}

export interface MediaDownload {
  url: string
  /** Epoch-millisekundet der den signerte URL-en slutter å virke. */
  expiresAt: number
}

export const mediaKeys = {
  all: ['media'] as const,
  download: (mediaId: string) => ['media', 'download', mediaId] as const,
}

/**
 * Kall som ber om en medie-URL i samme commit deler én
 * POST /api/v1/media/downloads. Laravel svarer med en CORS-preflight per POST,
 * så batchen sparer flere rundturer enn forespørselskroppen antyder.
 */
const batchWindowMs = 12
// Laravel tar imot 100 id-er per kall. Grensen her må ikke settes høyere.
const maximumBatchSize = 100

interface DownloadWaiter {
  resolve: (value: MediaDownload | null) => void
  reject: (error: unknown) => void
}

const waitingDownloads = new Map<string, DownloadWaiter[]>()
let downloadFlushTimer: ReturnType<typeof setTimeout> | undefined

async function flushDownloads() {
  if (downloadFlushTimer) clearTimeout(downloadFlushTimer)
  downloadFlushTimer = undefined

  const batch = new Map(waitingDownloads)
  // Tømmes synkront før await, slik at kall som kommer mens forespørselen er
  // underveis starter en ny batch i stedet for å vente på en som er sendt.
  waitingDownloads.clear()
  if (batch.size === 0) return

  try {
    const response = await apiRequest<MediaDownloads>(
      '/api/v1/media/downloads',
      {
        method: 'POST',
        body: JSON.stringify({ media_ids: [...batch.keys()] }),
      },
    )
    const expiresAt = Date.now() + response.data.expires_in * 1000
    const urls = new Map(
      response.data.items.map((item) => [item.media_id, item.url]),
    )

    for (const [mediaId, waiters] of batch) {
      const url = urls.get(mediaId)
      // En id uten URL gir null i stedet for feil: én slettet id skal ikke
      // tømme forhåndsvisningen til alle de andre i samme batch.
      const value = url ? { url, expiresAt } : null
      for (const waiter of waiters) waiter.resolve(value)
    }
  } catch (error) {
    for (const waiters of batch.values()) {
      for (const waiter of waiters) waiter.reject(error)
    }
  }
}

export function getMediaDownload(
  mediaId: string,
): Promise<MediaDownload | null> {
  return new Promise((resolve, reject) => {
    const waiters = waitingDownloads.get(mediaId)
    if (waiters) waiters.push({ resolve, reject })
    else waitingDownloads.set(mediaId, [{ resolve, reject }])

    if (waitingDownloads.size >= maximumBatchSize) void flushDownloads()
    else
      downloadFlushTimer ??= setTimeout(
        () => void flushDownloads(),
        batchWindowMs,
      )
  })
}

/** Hent en ny signert URL så lenge før den utløper. */
const expiryMarginMs = 60_000

/**
 * gcTime må være minst like lang som staleTime, og aldri lengre enn
 * expires_in fra Laravel. Ellers kan en remontering vise en død URL i én frame
 * før bakgrunnshentingen erstatter den. Juster sammen med backend.
 */
const downloadGcTimeMs = 9 * 60 * 1000

export function mediaDownloadQueryOptions(mediaId: string) {
  return queryOptions({
    queryKey: mediaKeys.download(mediaId),
    queryFn: () => getMediaDownload(mediaId),
    retry: false,
    staleTime: (query) => {
      const data = query.state.data
      if (!data) return 0
      // staleTime måles fra dataUpdatedAt, så gjenværende levetid uttrykkes
      // relativt til tidspunktet Laravel ga oss URL-en.
      return Math.max(
        0,
        data.expiresAt - query.state.dataUpdatedAt - expiryMarginMs,
      )
    },
    gcTime: downloadGcTimeMs,
  })
}

export async function deleteMedia(mediaId: string) {
  await apiRequest<{ message: string }>(`/api/v1/media/${mediaId}`, {
    method: 'DELETE',
  })
}

export type MediaKind = 'image' | 'audio' | 'video' | 'document'

export async function uploadMedia(
  ownerType: MediaOwnerType,
  ownerId: string,
  kind: MediaKind,
  file: File,
): Promise<MediaReference> {
  const created = await apiRequest<{ id: string }>('/api/v1/media', {
    method: 'POST',
    body: JSON.stringify({
      owner_type: ownerType,
      owner_id: ownerId,
      kind,
      original_filename: file.name,
      mime_type: file.type,
      byte_size: file.size,
      width: null,
      height: null,
      metadata: null,
    }),
  })
  const mediaId = created.data.id

  try {
    const requested = await apiRequest<MediaUpload>(
      `/api/v1/media/${mediaId}/uploads`,
      { method: 'POST' },
    )
    const upload = requested.data

    if (file.size > upload.maximum_byte_size) {
      throw new Error('Bildet er større enn maksimal tillatt filstørrelse.')
    }

    const response = await fetch(upload.url, {
      method: upload.method,
      headers: { 'Content-Type': upload.mime_type },
      body: file,
    })
    if (!response.ok) {
      throw new Error('Bildet kunne ikke lastes opp til bildelageret.')
    }

    return await apiRequest<MediaReference>(
      `/api/v1/media/${mediaId}/uploads/${upload.id}/complete`,
      { method: 'POST' },
    ).then((result) => result.data)
  } catch (error) {
    await deleteMedia(mediaId).catch(() => undefined)
    throw error
  }
}

export function uploadImage(
  ownerType: MediaOwnerType,
  ownerId: string,
  file: File,
) {
  return uploadMedia(ownerType, ownerId, 'image', file)
}
