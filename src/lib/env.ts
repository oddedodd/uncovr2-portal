import { z } from 'zod'

const defaultApiUrl = import.meta.env.PROD
  ? 'https://api.uncovr.no'
  : 'http://localhost:8000'

const environmentSchema = z.object({
  VITE_API_URL: z
    .url('VITE_API_URL må være en gyldig URL.')
    .refine((url) => ['http:', 'https:'].includes(new URL(url).protocol), {
      message: 'VITE_API_URL må bruke http eller https.',
    })
    .transform((url) => url.replace(/\/$/, '')),
})

export const env = environmentSchema.parse({
  VITE_API_URL: import.meta.env.VITE_API_URL ?? defaultApiUrl,
})
