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
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

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

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// The extracted-data JSON files are the source of truth for the dataset.
// This loader rebuilds the database to exactly match them: wipe, then recreate
// from every file. Idempotent in effect — re-running always yields the same DB.
const DATA_DIR = join(import.meta.dirname, 'extracted-data');

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

function listSeedFiles(): string[] {
  const files: string[] = [];
  for (const provider of readdirSync(DATA_DIR, { withFileTypes: true })) {
    if (!provider.isDirectory()) continue;
    const dir = join(DATA_DIR, provider.name);
    for (const file of readdirSync(dir)) {
      if (file.endsWith('.json')) files.push(join(dir, file));
    }
  }
  return files.sort();
}

// The transaction client — same query API as PrismaClient minus connection-lifecycle methods.
type TxClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

async function seedPolicy(tx: TxClient, seedData: SeedData) {
  const provider = await tx.provider.upsert({
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

  await tx.policy.create({
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
  });
}

async function main() {
  const files = listSeedFiles();

  // Wipe + re-seed all policies in a single transaction.
  // future: only remove and re-seed policies with updates?
  const seeded = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(
        `TRUNCATE TABLE
           providers, policies, policy_accounts,
           policy_account_fees, policy_account_fee_terms,
           policy_account_surrender_fees, policy_account_surrender_fee_terms,
           policy_account_premium_allocation_terms
         RESTART IDENTITY CASCADE`,
      );

      let count = 0;
      for (const file of files) {
        const seedData = JSON.parse(readFileSync(file, 'utf8')) as SeedData;
        try {
          await seedPolicy(tx, seedData);
          count++;
        } catch (e) {
          console.error(`Failed seeding ${file}`);
          throw e;
        }
      }
      return count;
    },
    { maxWait: 10_000, timeout: 60_000 },
  );

  console.log(`Seeded ${seeded}/${files.length} policies`);
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
