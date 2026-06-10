import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma.module.js';
import { PolicyModule } from './policy/policy.module.js';

@Module({
  imports: [PrismaModule, PolicyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
