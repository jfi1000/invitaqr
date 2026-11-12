import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';
import { UsersService } from '../users/users.service';
import { ACCESS_JWT, AuthService, REFRESH_JWT } from './auth.service';

describe('AuthService', () => {
  const usersService = {
    createPlanner: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    toProfile: jest.fn(),
  };
  const accessJwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
  const refreshJwt = {
    signAsync: jest.fn().mockResolvedValue('refresh-token'),
    verifyAsync: jest.fn(),
  };

  let service: AuthService;

  const planner = {
    id: 'user-1',
    name: 'Ana',
    email: 'ana@correo.com',
    passwordHash: '',
    role: UserRole.PLANNER,
    isActive: true,
  } as User;

  beforeAll(async () => {
    planner.passwordHash = await bcrypt.hash('secreto123', 4);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    accessJwt.signAsync.mockResolvedValue('access-token');
    refreshJwt.signAsync.mockResolvedValue('refresh-token');
    usersService.toProfile.mockImplementation((user: User) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: ACCESS_JWT, useValue: accessJwt },
        { provide: REFRESH_JWT, useValue: refreshJwt },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('registra un planner y abre sesión', async () => {
    usersService.createPlanner.mockResolvedValue(planner);
    usersService.findById.mockResolvedValue(planner);

    const session = await service.register({
      name: 'Ana',
      email: 'ana@correo.com',
      password: 'secreto123',
    });

    expect(usersService.createPlanner).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'ana@correo.com',
      password: 'secreto123',
    });
    expect(session.accessToken).toBe('access-token');
    expect(session.refreshToken).toBe('refresh-token');
    expect(session.user.role).toBe(UserRole.PLANNER);
    expect(accessJwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'access', sub: 'user-1' }),
    );
    expect(refreshJwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'refresh', sub: 'user-1' }),
    );
  });

  it('inicia sesión con credenciales correctas', async () => {
    usersService.findByEmail.mockResolvedValue(planner);
    usersService.findById.mockResolvedValue(planner);

    const session = await service.login({
      email: 'ana@correo.com',
      password: 'secreto123',
    });

    expect(session.user.email).toBe('ana@correo.com');
  });

  it('rechaza contraseña incorrecta', async () => {
    usersService.findByEmail.mockResolvedValue(planner);

    await expect(
      service.login({ email: 'ana@correo.com', password: 'otra-clave' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza una cuenta inactiva con el mismo error', async () => {
    usersService.findByEmail.mockResolvedValue({ ...planner, isActive: false });

    await expect(
      service.login({ email: 'ana@correo.com', password: 'secreto123' }),
    ).rejects.toMatchObject({
      response: { error: 'INVALID_CREDENTIALS' },
    });
  });

  it('renueva la sesión con un refresh válido', async () => {
    refreshJwt.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: planner.email,
      role: UserRole.PLANNER,
      type: 'refresh',
    });
    usersService.findById.mockResolvedValue(planner);

    const session = await service.refresh('refresh-token');

    expect(session.accessToken).toBe('access-token');
  });

  it('rechaza un refresh inválido o que no es de tipo refresh', async () => {
    refreshJwt.verifyAsync.mockRejectedValue(new Error('jwt malformed'));
    await expect(service.refresh('basura')).rejects.toMatchObject({
      response: { error: 'INVALID_REFRESH' },
    });

    refreshJwt.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      type: 'access',
    });
    await expect(service.refresh('access-token')).rejects.toMatchObject({
      response: { error: 'INVALID_REFRESH' },
    });
  });
});
