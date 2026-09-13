import { beforeEach, describe, expect, it, vi } from 'vitest'

const proxyActivities = vi.hoisted(() => vi.fn())

vi.mock('@temporalio/workflow', () => ({ proxyActivities }))

describe('verifyEmailWorkflow', () => {
  beforeEach(() => {
    vi.resetModules()
    proxyActivities.mockReset()
    proxyActivities.mockReturnValue({ verifyEmail: vi.fn() })
  })

  it('configures one-second attempts with three total attempts', async () => {
    await import('./workflows')

    expect(proxyActivities).toHaveBeenCalledWith({
      startToCloseTimeout: '1 second',
      retry: { maximumAttempts: 3 },
    })
  })
})
