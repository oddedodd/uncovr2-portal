import { describe, expect, it } from 'vitest'
import { summarizePlatform, type PlatformOverview } from './platform.ts'

describe('summarizePlatform', () => {
  it('summarizes platform resources and review state', () => {
    const overview: PlatformOverview = {
      organizations: [
        { id: 'label-1', status: 'active', profile: { name: 'North' } },
        { id: 'label-2', status: 'suspended', profile: { name: 'South' } },
      ],
      artists: [
        { id: 'artist-1', status: 'active', profile: { name: 'A' } },
        { id: 'artist-2', status: 'suspended', profile: { name: 'B' } },
      ],
      releases: [
        { id: 'release-1', status: 'submitted', title: 'First' },
        { id: 'release-2', status: 'published', title: 'Second' },
        { id: 'release-3', status: 'draft', title: 'Third' },
      ],
      releasesHaveMore: true,
    }

    expect(summarizePlatform(overview)).toEqual({
      organizations: 2,
      suspendedOrganizations: 1,
      artists: 2,
      suspendedArtists: 1,
      releases: 3,
      releasesHaveMore: true,
      releasesAwaitingReview: 1,
      publishedReleases: 1,
    })
  })
})
