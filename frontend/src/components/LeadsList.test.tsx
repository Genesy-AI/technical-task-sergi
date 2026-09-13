import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getMany: vi.fn(),
  verifyEmails: vi.fn(),
  loading: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('../api', () => ({
  api: {
    leads: {
      getMany: mocks.getMany,
      verifyEmails: mocks.verifyEmails,
    },
  },
}))

vi.mock('react-hot-toast', () => ({
  default: {
    loading: mocks.loading,
    success: mocks.success,
    error: mocks.error,
  },
}))

import { LeadsList } from './LeadsList'

const leads = [
  {
    id: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    jobTitle: null,
    countryCode: null,
    companyName: null,
    message: null,
    emailVerified: null,
  },
  {
    id: 2,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    jobTitle: null,
    countryCode: null,
    companyName: null,
    message: null,
    emailVerified: null,
  },
]

let container: HTMLDivElement
let root: Root
let queryClient: QueryClient

const waitFor = async (assertion: () => void) => {
  let lastError: unknown

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      assertion()
      return
    } catch (error) {
      lastError = error
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
    }
  }

  throw lastError
}

const renderLeadsList = async () => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <LeadsList />
      </QueryClientProvider>
    )
  })

  await waitFor(() => expect(container.querySelectorAll('tbody input')).toHaveLength(leads.length))
}

const selectAndVerify = async (count: number) => {
  const checkboxes = Array.from(container.querySelectorAll<HTMLInputElement>('tbody input'))

  await act(async () => {
    checkboxes.slice(0, count).forEach((checkbox) => checkbox.click())
  })
  await act(async () => {
    Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Enrich'))
      ?.click()
  })
  await act(async () => {
    Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Verify Email'))
      ?.click()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.loading.mockReturnValue('verification-toast')
  mocks.getMany.mockResolvedValue(leads)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  queryClient.clear()
})

describe('email verification feedback', () => {
  it('shows plural loading feedback, refetches once, and replaces it with success after refreshed statuses arrive', async () => {
    let resolveVerification: (value: unknown) => void = () => undefined
    mocks.verifyEmails.mockReturnValue(
      new Promise((resolve) => {
        resolveVerification = resolve
      })
    )
    mocks.getMany.mockResolvedValueOnce(leads).mockResolvedValueOnce([
      { ...leads[0], emailVerified: true },
      { ...leads[1], emailVerified: false },
    ])
    await renderLeadsList()
    const refetchQueries = vi.spyOn(queryClient, 'refetchQueries')

    await selectAndVerify(2)

    expect(mocks.loading).toHaveBeenCalledWith('Verifying 2 emails…')
    expect(mocks.verifyEmails).toHaveBeenCalledWith({ leadIds: [1, 2] })

    await act(async () => {
      resolveVerification({
        success: true,
        verifiedCount: 2,
        results: [
          { leadId: 1, emailVerified: true },
          { leadId: 2, emailVerified: false },
        ],
        errors: [],
      })
    })

    await waitFor(() =>
      expect(mocks.success).toHaveBeenCalledWith('Verified 2 emails', { id: 'verification-toast' })
    )
    expect(refetchQueries).toHaveBeenCalledTimes(1)
    expect(refetchQueries).toHaveBeenCalledWith({ queryKey: ['leads', 'getMany'], exact: true })
    expect(container.textContent).toContain('ada@example.com ✅')
    expect(container.textContent).toContain('john@example.com ❌')
  })

  it('reports completed validations and errors in one mixed-outcome toast', async () => {
    mocks.verifyEmails.mockResolvedValue({
      success: true,
      verifiedCount: 1,
      results: [{ leadId: 1, emailVerified: false }],
      errors: [{ leadId: 2, leadName: 'John Doe', error: 'Timed out' }],
    })
    await renderLeadsList()

    await selectAndVerify(2)

    await waitFor(() =>
      expect(mocks.success).toHaveBeenCalledWith('Verified 1 email with 1 error', {
        id: 'verification-toast',
      })
    )
  })

  it('uses error state and singular wording when every lead has a per-lead error', async () => {
    mocks.verifyEmails.mockResolvedValue({
      success: true,
      verifiedCount: 0,
      results: [],
      errors: [{ leadId: 1, leadName: 'Ada Lovelace', error: 'Timed out' }],
    })
    await renderLeadsList()

    await selectAndVerify(1)

    expect(mocks.loading).toHaveBeenCalledWith('Verifying 1 email…')
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith('Failed to verify 1 email', {
        id: 'verification-toast',
      })
    )
    expect(container.textContent).toContain('ada@example.com ❓')
  })

  it('replaces loading feedback with generic failure message when request rejects', async () => {
    mocks.verifyEmails.mockRejectedValue(new Error('Network error'))
    await renderLeadsList()

    await selectAndVerify(1)

    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith('Failed to verify emails. Please try again.', {
        id: 'verification-toast',
      })
    )
  })
})
