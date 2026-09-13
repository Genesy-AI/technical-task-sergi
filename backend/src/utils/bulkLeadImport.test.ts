import { describe, expect, it, vi } from 'vitest'
import { importBulkLeads } from './bulkLeadImport'

const createRepository = () => {
  const create = vi.fn().mockResolvedValue({})
  return {
    create,
    prisma: {
      lead: {
        findMany: vi.fn().mockResolvedValue([]),
        create,
      },
    },
  }
}

describe('importBulkLeads country validation', () => {
  it('persists supported trimmed country code', async () => {
    const { prisma, create } = createRepository()

    const result = await importBulkLeads(prisma, [
      { firstName: 'John', lastName: 'Doe', email: 'john@example.com', countryCode: ' US ' },
    ])

    expect(result).toMatchObject({ importedCount: 1, invalidLeads: 0, errors: [] })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ countryCode: 'US' }) })
    )
  })

  it('persists blank, missing, and null country codes without warnings', async () => {
    const { prisma, create } = createRepository()

    const result = await importBulkLeads(prisma, [
      { firstName: 'Blank', lastName: 'Country', email: 'blank@example.com', countryCode: '   ' },
      { firstName: 'Missing', lastName: 'Country', email: 'missing@example.com' },
      { firstName: 'Null', lastName: 'Country', email: 'null@example.com', countryCode: null },
    ])

    expect(result).toMatchObject({ importedCount: 3, invalidLeads: 0, errors: [] })
    expect(
      create.mock.calls.map(([args]) => (args as { data: { countryCode: string } }).data.countryCode)
    ).toEqual(['', '', ''])
  })

  it('imports unsupported country values as empty strings with non-blocking warnings', async () => {
    const { prisma, create } = createRepository()
    const leads = [
      { firstName: 'Lower', lastName: 'Case', email: 'lower@example.com', countryCode: 'us' },
      { firstName: 'Mixed', lastName: 'Case', email: 'mixed@example.com', countryCode: 'Us' },
      { firstName: 'Number', lastName: 'Country', email: 'number@example.com', countryCode: 12 },
      { firstName: 'Object', lastName: 'Country', email: 'object@example.com', countryCode: {} },
    ]

    const result = await importBulkLeads(prisma, leads)

    expect(result).toMatchObject({ importedCount: 4, invalidLeads: 0 })
    expect(result.errors).toEqual(leads.map((lead) => ({ lead, error: 'Invalid country code' })))
    expect(
      create.mock.calls.map(([args]) => (args as { data: { countryCode: string } }).data.countryCode)
    ).toEqual(['', '', '', ''])
  })

  it('continues to exclude leads missing required fields', async () => {
    const { prisma, create } = createRepository()

    const result = await importBulkLeads(prisma, [
      { firstName: '', lastName: 'Doe', email: 'invalid@example.com', countryCode: 'XXX' },
      { firstName: 'John', lastName: 'Doe', email: 'john@example.com', countryCode: 'US' },
    ])

    expect(result).toMatchObject({ importedCount: 1, invalidLeads: 1, errors: [] })
    expect(create).toHaveBeenCalledTimes(1)
  })
})
