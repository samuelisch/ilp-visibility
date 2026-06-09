import { Controller, Get } from '@nestjs/common';
import { PolicyService } from './policy.service';

@Controller('policies')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get()
  getPolicies(): string {
    return this.policyService.getPolicies();
  }
}
