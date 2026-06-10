import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { Policy } from '../generated/prisma/client.js';

@Injectable()
export class PolicyService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Policy[]> {
    return await this.prisma.policy.findMany();
  }
}
