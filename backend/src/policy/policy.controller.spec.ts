import { Test, TestingModule } from '@nestjs/testing';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';

describe('PolicyController', () => {
  let policyController: PolicyController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PolicyController],
      providers: [PolicyService],
    }).compile();

    policyController = app.get<PolicyController>(PolicyController);
  });

  describe('policies', () => {
    it('should return "Policies"', () => {
      expect(policyController.getPolicies()).toBe('Policies');
    });
  });
});
