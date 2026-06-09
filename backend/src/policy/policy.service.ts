import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyService {
  getPolicies(): string {
    return 'Policies';
  }
}
