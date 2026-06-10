import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { PolicyService } from './policy.service.js';
import { Policy } from '../generated/prisma/client.js';

@Controller('policies')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get()
  async findAll(
    @Query('q') q?: string,
    @Query('provider', new ParseIntPipe({ optional: true })) provider?: number,
  ): Promise<Policy[]> {
    return this.policyService.findAll(q, provider);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.policyService.findOne(id);
  }
}
