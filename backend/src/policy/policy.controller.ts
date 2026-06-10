import { Controller, Get } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { Policy } from '@prisma/client';

@Controller('policies')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get()
  async findAll(): Promise<Policy[]> {
    return this.policyService.findAll();
  }
}
