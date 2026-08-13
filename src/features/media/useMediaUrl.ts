import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { mediaDownloadQueryOptions } from '../../lib/media.ts'

/**
 * Medieoppslag får ikke videresendt AbortSignal: flere komponenter deler én
 * batchet POST, så en avbrutt montering ville revet forespørselen vekk under
 * de andre som venter på den samme.
 */
export function useMediaUrl(mediaId: string | null | undefined) {
  const query = useQuery({
    ...mediaDownloadQueryOptions(mediaId ?? ''),
    enabled: Boolean(mediaId),
  })

  return {
    url: query.data?.url,
    isPending: Boolean(mediaId) && query.isPending,
    error: query.error,
  }
}

export function useMediaUrls(mediaIds: Array<string | null | undefined>) {
  const joined = mediaIds.filter(Boolean).join(',')
  // Kallstedene bygger et nytt array hver render, så avhengigheten må være
  // innholdet og ikke identiteten til arrayet.
  const ids = useMemo(
    () => [...new Set(joined ? joined.split(',') : [])],
    [joined],
  )

  return useQueries({
    queries: ids.map((mediaId) => mediaDownloadQueryOptions(mediaId)),
    combine: (results) => ({
      urls: new Map(
        results.flatMap((result, index) =>
          result.data?.url ? [[ids[index]!, result.data.url] as const] : [],
        ),
      ),
      isPending: results.some((result) => result.isPending),
    }),
  })
}
