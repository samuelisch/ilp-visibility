import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

const policyListSelect = {
  id: true,
  name: true,
  description: true,
  domicile: true,
  paymentTermYears: true,
  sourceType: true,
  provider: { select: { name: true } },
} satisfies Prisma.PolicySelect;

export type PolicyListItem = Prisma.PolicyGetPayload<{
  select: typeof policyListSelect;
}>;

@Injectable()
export class PolicyService {
  constructor(private prisma: PrismaService) {}

  async findAll(q?: string, provider?: number): Promise<PolicyListItem[]> {
    const trimmedQ = q?.trim();
    return await this.prisma.policy.findMany({
      where: {
        ...(trimmedQ && { name: { contains: trimmedQ, mode: 'insensitive' } }),
        ...(provider !== undefined && { providerId: provider }),
      },
      select: policyListSelect,
    });
  }

  async findOne(id: number) {
    const policy = await this.prisma.policy.findUnique({
      where: { id },
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

    if (!policy) {
      throw new NotFoundException(`Policy with id ${id} not found`);
    }

    return policy;
  }
}
