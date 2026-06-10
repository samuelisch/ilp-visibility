import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Policy } from '@prisma/client';

@Injectable()
export class PolicyService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Policy[]> {
    return await this.prisma.policy.findMany();
  }
}
