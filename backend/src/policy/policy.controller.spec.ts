import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PolicyController } from './policy.controller.js';
import { PolicyService } from './policy.service.js';
import { Domicile, SourceType } from '../generated/prisma/client.js';

vi.mock('../generated/prisma/client.js', () => ({
  PrismaClient: class {},
}));

describe('PolicyController', () => {
  let policyController: PolicyController;
  const policyService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PolicyController],
      providers: [
        {
          provide: PolicyService,
          useValue: policyService,
        },
      ],
    }).compile();

    policyController = moduleRef.get<PolicyController>(PolicyController);
  });

  describe('findAll', () => {
    it('should return an array of policies', async () => {
      const result = [
        {
          id: 1,
          providerId: 1,
          name: 'policytest',
          description: 'test',
          sourceType: 'cash_or_srs' as SourceType,
          domicile: 'sgd' as Domicile,
          paymentTermYears: null,
        },
      ];
      policyService.findAll.mockResolvedValue(result);

      expect(await policyController.findAll()).toBe(result);
    });
  });

  describe('findOne', () => {
    it('should return a policy with all nested relations', async () => {
      const result = {
        id: 1,
        providerId: 1,
        name: 'Test Policy',
        description: 'test',
        sourceType: 'cash_or_srs' as SourceType,
        domicile: 'sgd' as Domicile,
        paymentTermYears: null,
        policyAccounts: [
          {
            id: 1,
            policyId: 1,
            description: 'Account 1',
            allocationFromPolicyYear: 1,
            allocationTillPolicyYear: null,
            premiumChargePercentage: '100.00',
            premiumAllocationType: 'single',
            termEndBehaviour: null,
            policyAccountFees: [],
            policyAccountPremiumAllocationTerms: [],
            policyAccountSurrenderFees: [],
          },
        ],
        policyAccountFees: [],
        policyAccountSurrenderFees: [],
      };
      policyService.findOne.mockResolvedValue(result);

      expect(await policyController.findOne(1)).toBe(result);
    });

    it('should propagate NotFoundException when policy does not exist', async () => {
      policyService.findOne.mockRejectedValue(
        new NotFoundException('Policy with id 999 not found'),
      );

      await expect(policyController.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
