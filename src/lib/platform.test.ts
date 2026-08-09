import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPlatformOverview } from './platform.ts'

afterEach(() => vi.restoreAllMocks())

describe('getPlatformOverview', () => {
  it('uses the protected aggregate endpoint', async () => {
    const overview = {
      users: { total: 3, by_status: { active: 3 }, superadmins: 1 },
      organizations: { total: 2, by_status: { active: 2 } },
      artists: { total: 1, by_status: { active: 1 } },
      releases: { total: 4, by_status: { published: 2 } },
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: overview }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(getPlatformOverview()).resolves.toEqual(overview)
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://localhost:8000/api/v1/platform/overview'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })
})
