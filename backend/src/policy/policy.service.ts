import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { Policy } from '../generated/prisma/client.js';

@Injectable()
export class PolicyService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Policy[]> {
    return await this.prisma.policy.findMany();
  }

  async findOne(id: number) {
    const policy = await this.prisma.policy.findUnique({
      where: { id },
      include: {
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

    if (!policy) {
      throw new NotFoundException(`Policy with id ${id} not found`);
    }

    return policy;
  }
}
