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

export const mediaKeys = {
  downloads: (mediaIds: string[]) =>
    ['media', 'downloads', [...mediaIds].sort()] as const,
}

export async function getMediaDownloadUrls(mediaIds: string[]) {
  if (mediaIds.length === 0) return new Map<string, string>()

  const response = await apiRequest<MediaDownloads>('/api/v1/media/downloads', {
    method: 'POST',
    body: JSON.stringify({ media_ids: [...new Set(mediaIds)] }),
  })

  return new Map(response.data.items.map((item) => [item.media_id, item.url]))
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
