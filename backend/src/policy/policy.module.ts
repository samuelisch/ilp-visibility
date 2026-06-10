import { Module } from '@nestjs/common';
import { PolicyController } from './policy.controller.js';
import { PolicyService } from './policy.service.js';
import { PrismaService } from '../prisma.service.js';

@Module({
  imports: [],
  controllers: [PolicyController],
  providers: [PolicyService, PrismaService],
})
export class PolicyModule {}
