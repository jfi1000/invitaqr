import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { User } from './user.entity';
import { UserRole } from './user-role.enum';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const repository = {
    create: jest.fn((input) => input),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('crea un planner y no guarda la contraseña en claro', async () => {
    repository.save.mockImplementation(async (user) => ({
      ...user,
      id: 'user-1',
    }));

    const created = await service.createPlanner({
      name: 'Ana',
      email: 'Ana@Correo.com',
      password: 'secreto123',
    });

    expect(created.role).toBe(UserRole.PLANNER);
    expect(created.email).toBe('ana@correo.com');
    expect(created.passwordHash).not.toBe('secreto123');
    expect(created.passwordHash.startsWith('$2')).toBe(true);
  });

  it('rechaza un correo duplicado', async () => {
    const duplicate = new QueryFailedError('insert', [], new Error('dup'));
    Object.assign(duplicate, { driverError: { code: '23505' } });
    repository.save.mockRejectedValue(duplicate);

    await expect(
      service.createPlanner({
        name: 'Ana',
        email: 'ana@correo.com',
        password: 'secreto123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('no vuelve a crear el OWNER si el correo ya existe', async () => {
    repository.findOne.mockResolvedValue({
      id: 'owner-1',
      email: 'admin@xalapasoft.com',
      role: UserRole.OWNER,
    });

    const owner = await service.ensureOwner({
      name: 'Xalapasoft',
      email: 'admin@xalapasoft.com',
      password: 'secreto123',
    });

    expect(owner.id).toBe('owner-1');
    expect(repository.save).not.toHaveBeenCalled();
  });
});
