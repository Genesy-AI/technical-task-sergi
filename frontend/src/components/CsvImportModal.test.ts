import { describe, expect, it } from 'vitest'
import { mapCsvLeadsToBulkImportInput } from './CsvImportModal'

describe('mapCsvLeadsToBulkImportInput', () => {
  it('preserves empty country codes for valid rows', () => {
    const result = mapCsvLeadsToBulkImportInput([
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        countryCode: '',
        isValid: true,
        errors: ['Invalid country code'],
        rowIndex: 2,
      },
    ])

    expect(result.leads[0].countryCode).toBe('')
  })
})
