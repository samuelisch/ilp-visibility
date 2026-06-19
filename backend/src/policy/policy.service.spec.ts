import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PolicyService } from './policy.service.js';
import { PrismaService } from '../prisma.service.js';

const mockPrisma = {
  policy: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
};

describe('PolicyService', () => {
  let policyService: PolicyService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [PolicyService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    policyService = moduleRef.get<PolicyService>(PolicyService);
  });

  describe('findAll', () => {
    const policies = [
      {
        id: 1,
        name: 'Test Policy',
        description: 'test',
        domicile: 'sgd',
        paymentTermYears: null,
        sourceType: 'cash_or_srs',
        provider: { name: 'Test Insurer' },
        policyAccounts: [{ premiumAllocationType: 'single' }],
      },
    ];

    // Mirrors the select in policy.service.ts; every findAll query must request it.
    const listSelect = {
      id: true,
      name: true,
      description: true,
      domicile: true,
      paymentTermYears: true,
      sourceType: true,
      provider: { select: { name: true } },
      policyAccounts: { select: { premiumAllocationType: true } },
    };

    it('should query with no where clause when no filters provided', async () => {
      mockPrisma.policy.findMany.mockResolvedValue(policies);

      expect(await policyService.findAll()).toBe(policies);
      expect(mockPrisma.policy.findMany).toHaveBeenCalledWith({
        where: {},
        select: listSelect,
      });
    });

    it('should apply case-insensitive contains filter when q is provided', async () => {
      mockPrisma.policy.findMany.mockResolvedValue(policies);

      expect(await policyService.findAll('elite')).toBe(policies);
      expect(mockPrisma.policy.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'elite', mode: 'insensitive' },
        },
        select: listSelect,
      });
    });

    it('should trim whitespace from q before filtering', async () => {
      mockPrisma.policy.findMany.mockResolvedValue(policies);

      expect(await policyService.findAll('  elite  ')).toBe(policies);
      expect(mockPrisma.policy.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'elite', mode: 'insensitive' },
        },
        select: listSelect,
      });
    });

    it('should skip name filter when q is whitespace-only', async () => {
      mockPrisma.policy.findMany.mockResolvedValue(policies);

      expect(await policyService.findAll('   ')).toBe(policies);
      expect(mockPrisma.policy.findMany).toHaveBeenCalledWith({
        where: {},
        select: listSelect,
      });
    });

    it('should apply providerId filter when provider is provided', async () => {
      mockPrisma.policy.findMany.mockResolvedValue(policies);

      expect(await policyService.findAll(undefined, 1)).toBe(policies);
      expect(mockPrisma.policy.findMany).toHaveBeenCalledWith({
        where: {
          providerId: 1,
        },
        select: listSelect,
      });
    });

    it('should apply both filters when q and provider are provided', async () => {
      mockPrisma.policy.findMany.mockResolvedValue(policies);

      expect(await policyService.findAll('elite', 1)).toBe(policies);
      expect(mockPrisma.policy.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'elite', mode: 'insensitive' },
          providerId: 1,
        },
        select: listSelect,
      });
    });

    it('should apply providerId filter when provider is 0', async () => {
      mockPrisma.policy.findMany.mockResolvedValue([]);

      expect(await policyService.findAll(undefined, 0)).toEqual([]);
      expect(mockPrisma.policy.findMany).toHaveBeenCalledWith({
        where: {
          providerId: 0,
        },
        select: listSelect,
      });
    });
  });

  describe('findOne', () => {
    const fullPolicy = {
      id: 1,
      name: 'Test Policy',
      provider: { name: 'Test Insurer' },
      policyAccounts: [],
      policyAccountFees: [],
      policyAccountSurrenderFees: [],
    };

    it('should query with correct id and nested include tree', async () => {
      mockPrisma.policy.findUnique.mockResolvedValue(fullPolicy);

      const result = await policyService.findOne(1);

      expect(result).toBe(fullPolicy);
      expect(mockPrisma.policy.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          provider: { select: { name: true } },
          policyAccounts: {
            include: {
              policyAccountFees: {
                include: { policyAccountFeeTerms: true },
              },
              policyAccountPremiumAllocationTerms: true,
              policyAccountSurrenderFees: {
                include: { policyAccountSurrenderFeeTerms: true },
              },
            },
          },
          policyAccountFees: {
            where: { policyAccountId: null },
          },
          policyAccountSurrenderFees: {
            where: { policyAccountId: null },
          },
        },
      });
    });

    it('should throw NotFoundException when policy does not exist', async () => {
      mockPrisma.policy.findUnique.mockResolvedValue(null);

      await expect(policyService.findOne(999)).rejects.toThrow(
        new NotFoundException('Policy with id 999 not found'),
      );
    });
  });
});
