import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AuthUser } from '../auth/token-payload';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() current: AuthUser) {
    const user = await this.usersService.findById(current.id);
    if (!user) {
      throw new NotFoundException({
        error: 'USER_NOT_FOUND',
        message: 'Usuario no encontrado',
      });
    }
    return this.usersService.toProfile(user);
  }

  @Patch('me')
  @ResponseMessage('Perfil actualizado')
  async updateProfile(
    @CurrentUser() current: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateName(current.id, dto.name);
    return this.usersService.toProfile(user);
  }

  @Patch('me/password')
  @ResponseMessage('Contraseña actualizada')
  async changePassword(
    @CurrentUser() current: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      current.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { updated: true };
  }
}
