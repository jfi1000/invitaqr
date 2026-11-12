import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class OwnerSeedService implements OnModuleInit {
  private readonly logger = new Logger(OwnerSeedService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('OWNER_EMAIL');
    const password = this.config.get<string>('OWNER_PASSWORD');
    const name = this.config.get<string>('OWNER_NAME', 'Xalapasoft');

    if (!email || !password) {
      this.logger.warn(
        'OWNER_EMAIL u OWNER_PASSWORD vacíos: no se sembró la cuenta de Xalapasoft',
      );
      return;
    }

    const owner = await this.usersService.ensureOwner({ name, email, password });
    this.logger.log(`Cuenta OWNER lista: ${owner.email}`);
  }
}
