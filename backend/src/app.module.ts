import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module.js';
import { PolicyModule } from './policy/policy.module.js';

@Module({
  imports: [PrismaModule, PolicyModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
