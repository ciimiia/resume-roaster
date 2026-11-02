import type { JobSourceAdapter, JobSourceId } from '../types'
import { greenhouseAdapter } from './greenhouse'
import { leverAdapter } from './lever'
import { ashbyAdapter } from './ashby'
import { remotiveAdapter } from './remotive'
import { arbeitnowAdapter } from './arbeitnow'
import { adzunaAdapter } from './adzuna'

export const ADAPTERS: Record<JobSourceId, JobSourceAdapter> = {
  greenhouse: greenhouseAdapter,
  lever: leverAdapter,
  ashby: ashbyAdapter,
  remotive: remotiveAdapter,
  arbeitnow: arbeitnowAdapter,
  adzuna: adzunaAdapter,
}

export { greenhouseAdapter, leverAdapter, ashbyAdapter, remotiveAdapter, arbeitnowAdapter, adzunaAdapter }
