import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'node:http'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  execute: vi.fn(),
  connect: vi.fn(),
  close: vi.fn(),
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    lead = {
      findMany: mocks.findMany,
      update: mocks.update,
    }
  },
}))

vi.mock('@temporalio/client', () => ({
  Connection: { connect: mocks.connect },
  Client: class {
    workflow = { execute: mocks.execute }
  },
}))

vi.mock('./worker', () => ({ runTemporalWorker: vi.fn() }))
vi.mock('./workflows', () => ({ verifyEmailWorkflow: vi.fn() }))

let app: Awaited<typeof import('./index')>['app']
let server: Server | undefined

beforeAll(async () => {
  ;({ app } = await import('./index'))
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.connect.mockResolvedValue({ close: mocks.close })
  mocks.update.mockResolvedValue({})
})

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()))
    server = undefined
  }
})

describe('POST /leads/verify-emails', () => {
  it('continues sequentially after a terminal workflow failure and persists completed booleans', async () => {
    mocks.findMany.mockResolvedValue([
      { id: 1, firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', emailVerified: null },
      { id: 2, firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', emailVerified: null },
      { id: 3, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', emailVerified: null },
    ])
    mocks.execute
      .mockRejectedValueOnce(new Error('Activity timed out after three attempts'))
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)

    const currentServer = app.listen(0)
    server = currentServer
    await new Promise<void>((resolve) => currentServer.once('listening', resolve))
    const address = currentServer.address() as { port: number }
    const response = await fetch(`http://127.0.0.1:${address.port}/leads/verify-emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds: [1, 2, 3] }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      verifiedCount: 2,
      results: [
        { leadId: 2, emailVerified: false },
        { leadId: 3, emailVerified: true },
      ],
      errors: [
        {
          leadId: 1,
          leadName: 'Jane Smith',
          error: 'Activity timed out after three attempts',
        },
      ],
    })
    expect(mocks.execute.mock.calls.map(([, options]) => options.args[0])).toEqual([
      'jane.smith@example.com',
      'john.doe@example.com',
      'ada@example.com',
    ])
    expect(mocks.update).toHaveBeenCalledTimes(2)
    expect(mocks.update).toHaveBeenNthCalledWith(1, {
      where: { id: 2 },
      data: { emailVerified: false },
    })
    expect(mocks.update).toHaveBeenNthCalledWith(2, {
      where: { id: 3 },
      data: { emailVerified: true },
    })
    expect(mocks.close).toHaveBeenCalledOnce()
  })
})
