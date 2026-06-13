import { Pool } from 'pg';
import {
  PrismaClient,
  ChargeSchedule,
  Domicile,
  FeeType,
  PremiumAllocationType,
  SourceType,
  SurrenderFeeType,
  TermEndBehaviour,
} from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import rawSeedData from './seed-data/aia/aia-wealth-venture.json' with { type: 'json' };

interface SeedFeeTerms {
  policyYear: number;
  chargePercentage: number;
}

interface SeedFee {
  description: string;
  chargeSchedule: ChargeSchedule;
  activeFromPolicyYear: number;
  termEndBehaviour: TermEndBehaviour | null;
  recurringLength: number | null;
  feeType: FeeType;
  notionalPercentage: number | null;
  isFeeAvailable: boolean;
  chargePercentage: number | null;
  flatFeeAmount: number | null;
  minPremium: number | null;
  maxPremium: number | null;
  policyAccountFeeTerms: SeedFeeTerms[];
}

interface SeedSurrenderFee {
  termEndBehaviour: TermEndBehaviour;
  feeType: SurrenderFeeType;
  policyAccountSurrenderFeeTerms: SeedFeeTerms[];
}

interface SeedPolicyAccount {
  description: string;
  allocationFromPolicyYear: number;
  allocationTillPolicyYear: number | null;
  premiumChargePercentage: number | null;
  premiumAllocationType: PremiumAllocationType;
  termEndBehaviour: TermEndBehaviour | null;
  policyAccountPremiumAllocationTerms: {
    policyYear: number;
    premiumChargePercentage: number;
  }[];
  policyAccountFees: SeedFee[];
  policyAccountSurrenderFees: SeedSurrenderFee[];
}

interface SeedData {
  provider: { name: string };
  policy: {
    name: string;
    description: string;
    sourceType: SourceType;
    domicile: Domicile;
    paymentTermYears: number | null;
    policyAccounts: SeedPolicyAccount[];
    policyAccountFees: SeedFee[];
    policyAccountSurrenderFees: SeedSurrenderFee[];
  };
}

const seedData: SeedData = rawSeedData as SeedData;

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function mapFees(fees: SeedFee[]) {
  return fees.map(({ policyAccountFeeTerms, ...feeFields }) => ({
    ...feeFields,
    policyAccountFeeTerms: { create: policyAccountFeeTerms },
  }));
}

function mapSurrenderFees(surrenderFees: SeedSurrenderFee[]) {
  return surrenderFees.map(({ policyAccountSurrenderFeeTerms, ...surrenderFeeFields }) => ({
    ...surrenderFeeFields,
    policyAccountSurrenderFeeTerms: { create: policyAccountSurrenderFeeTerms },
  }));
}

async function main() {
  const provider = await prisma.provider.upsert({
    where: { name: seedData.provider.name },
    update: {},
    create: seedData.provider,
  });

  const {
    policyAccounts,
    policyAccountFees: globalPolicyAccountFees,
    policyAccountSurrenderFees: globalPolicyAccountSurrenderFees,
    ...policyFields
  } = seedData.policy;

  const policy = await prisma.policy.create({
    data: {
      providerId: provider.id,
      ...policyFields,
      policyAccounts: {
        create: policyAccounts.map(
          ({
            policyAccountPremiumAllocationTerms,
            policyAccountFees,
            policyAccountSurrenderFees,
            ...accountFields
          }) => ({
            ...accountFields,
            policyAccountPremiumAllocationTerms: { create: policyAccountPremiumAllocationTerms },
            policyAccountFees: { create: mapFees(policyAccountFees) },
            policyAccountSurrenderFees: { create: mapSurrenderFees(policyAccountSurrenderFees) },
          }),
        ),
      },
      policyAccountFees: { create: mapFees(globalPolicyAccountFees) },
      policyAccountSurrenderFees: { create: mapSurrenderFees(globalPolicyAccountSurrenderFees) },
    },
    include: {
      policyAccounts: {
        include: {
          policyAccountPremiumAllocationTerms: true,
          policyAccountFees: { include: { policyAccountFeeTerms: true } },
          policyAccountSurrenderFees: { include: { policyAccountSurrenderFeeTerms: true } },
        },
      },
      policyAccountFees: { include: { policyAccountFeeTerms: true } },
      policyAccountSurrenderFees: { include: { policyAccountSurrenderFeeTerms: true } },
    },
  });

  console.log(JSON.stringify(policy, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
