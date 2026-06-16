import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { PolicyService, PolicyListItem } from './policy.service.js';

@Controller('policies')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get()
  async findAll(
    @Query('q') q?: string,
    @Query('provider', new ParseIntPipe({ optional: true })) provider?: number,
  ): Promise<PolicyListItem[]> {
    return this.policyService.findAll(q, provider);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.policyService.findOne(id);
  }
}
