import { validateCountryCode } from './countryCodes'

export interface BulkLead {
  firstName?: unknown
  lastName?: unknown
  email?: unknown
  jobTitle?: unknown
  countryCode?: unknown
  companyName?: unknown
}

interface LeadRepository {
  lead: {
    findMany: (args: any) => Promise<Array<{ firstName: string; lastName: string | null }>>
    create: (args: any) => Promise<unknown>
  }
}

export const isValidBulkLead = (
  lead: unknown
): lead is BulkLead & { firstName: string; lastName: string; email: string } => {
  if (!lead || typeof lead !== 'object') {
    return false
  }

  const { firstName, lastName, email } = lead as BulkLead
  return (
    typeof firstName === 'string' &&
    Boolean(firstName.trim()) &&
    typeof lastName === 'string' &&
    Boolean(lastName.trim()) &&
    typeof email === 'string' &&
    Boolean(email.trim())
  )
}

export const importBulkLeads = async (prisma: LeadRepository, leads: unknown[]) => {
  const validLeads = leads.filter(isValidBulkLead)
  const errors: Array<{ lead: BulkLead; error: string }> = []

  if (validLeads.length === 0) {
    return {
      validLeadCount: 0,
      importedCount: 0,
      duplicatesSkipped: 0,
      invalidLeads: leads.length,
      errors,
    }
  }

  const existingLeads = await prisma.lead.findMany({
    where: {
      OR: validLeads.map((lead) => ({
        AND: [{ firstName: lead.firstName.trim() }, { lastName: lead.lastName.trim() }],
      })),
    },
  })

  const leadKeys = new Set(
    existingLeads.map((lead) => `${lead.firstName.toLowerCase()}_${(lead.lastName || '').toLowerCase()}`)
  )

  const uniqueLeads = validLeads.filter((lead) => {
    const key = `${lead.firstName.toLowerCase()}_${lead.lastName.toLowerCase()}`
    return !leadKeys.has(key)
  })

  let importedCount = 0

  for (const lead of uniqueLeads) {
    const country = validateCountryCode(lead.countryCode)

    try {
      await prisma.lead.create({
        data: {
          firstName: lead.firstName.trim(),
          lastName: lead.lastName.trim(),
          email: lead.email.trim(),
          jobTitle: lead.jobTitle ? (lead.jobTitle as string).trim() : null,
          countryCode: country.countryCode,
          companyName: lead.companyName ? (lead.companyName as string).trim() : null,
        },
      })
      importedCount++

      if (country.isUnsupported) {
        errors.push({ lead, error: 'Invalid country code' })
      }
    } catch (error) {
      errors.push({
        lead,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    validLeadCount: validLeads.length,
    importedCount,
    duplicatesSkipped: validLeads.length - uniqueLeads.length,
    invalidLeads: leads.length - validLeads.length,
    errors,
  }
}
