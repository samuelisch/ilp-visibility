import { describe, it, expect } from 'vitest'
import {
  formatDomicile,
  formatMip,
  formatPremiumType,
  formatProductSubtext,
} from './format'
import type { PolicyListItem } from '../types/policy'

describe('formatDomicile', () => {
  it('maps sgd/usd to upper-case labels', () => {
    expect(formatDomicile('sgd')).toBe('SGD')
    expect(formatDomicile('usd')).toBe('USD')
  })
})

describe('formatMip', () => {
  it('null → Single premium', () => {
    expect(formatMip(null)).toBe('Single premium')
  })
  it('number → N-year MIP', () => {
    expect(formatMip(20)).toBe('20-year MIP')
  })
})

describe('formatPremiumType', () => {
  it('null → Single, number → Regular', () => {
    expect(formatPremiumType(null)).toBe('Single')
    expect(formatPremiumType(10)).toBe('Regular')
  })
})

describe('formatProductSubtext', () => {
  const base: PolicyListItem = {
    id: 1,
    name: 'X',
    description: 'Y',
    domicile: 'sgd',
    paymentTermYears: 25,
    sourceType: 'cash',
    provider: { name: 'AIA' },
  }
  it('composes "{DOMICILE} · {MIP}"', () => {
    expect(formatProductSubtext(base)).toBe('SGD · 25-year MIP')
    expect(formatProductSubtext({ ...base, paymentTermYears: null })).toBe(
      'SGD · Single premium',
    )
  })
})
