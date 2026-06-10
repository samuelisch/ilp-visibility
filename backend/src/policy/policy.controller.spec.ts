import { Test, TestingModule } from '@nestjs/testing';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';
import { Domicile, SourceType } from '@prisma/client';

jest.mock('@prisma/client', () => ({
  PrismaClient: class {},
}));

describe('PolicyController', () => {
  let policyController: PolicyController;
  const policyService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
});
