import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { QueryFailedError, Repository } from 'typeorm';
import { BCRYPT_ROUNDS } from '../common/constants';
import { User } from './user.entity';
import { UserProfile } from './user-profile';
import { UserRole } from './user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  toProfile(user: User): UserProfile {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  findByEmail(email: string) {
    return this.users.findOne({ where: { email: email.toLowerCase() } });
  }

  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  async createPlanner(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<User> {
    return this.createUser({ ...input, role: UserRole.PLANNER });
  }

  async ensureOwner(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<User> {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      return existing;
    }
    return this.createUser({ ...input, role: UserRole.OWNER });
  }

  async updateName(userId: string, name: string): Promise<User> {
    const user = await this.requireUser(userId);
    user.name = name.trim();
    return this.users.save(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.requireUser(userId);
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'La contraseña actual no es correcta',
      });
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'La nueva contraseña debe ser distinta a la actual',
      });
    }
    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.users.save(user);
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException({
        error: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado',
      });
    }
    return user;
  }

  private async createUser(input: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = this.users.create({
      name: input.name.trim(),
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      isActive: true,
    });

    try {
      return await this.users.save(user);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          error: 'EMAIL_ALREADY_EXISTS',
          message: 'Ese correo ya está registrado',
        });
      }
      throw error;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string } | undefined)?.code === '23505'
    );
  }
}
