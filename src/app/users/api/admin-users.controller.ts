import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/context/shared/guards/jwt-auth.guard';
import { UserBaseService } from '../services/users.service';
import { UserType } from '../enums/user-type';
import { Status } from 'src/context/shared/models/active.model';
import { UserPayload } from 'src/context/shared/decorators/user.decorator';
import { PayloadToken } from 'src/context/shared/models/token.model';

@UseGuards(JwtAuthGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UserBaseService) {}

  @Post('verify-password')
  async verifyPassword(
    @UserPayload() user: PayloadToken,
    @Body() body: { password: string },
  ) {
    const isValid = await this.usersService.verifyPassword(user.sub, body.password);
    return { valid: isValid };
  }

  @Get()
  findAll() {
    return this.usersService.findAdminsDoctorsAndTechnicals();
  }

  @Post()
  create(
    @Body()
    body: {
      fullname: string;
      email: string;
      password: string;
      role: 'admin' | 'doctor' | 'technical';
      address?: string;
    },
  ) {
    const typeMap: Record<string, UserType> = {
      admin: UserType.ADMIN,
      doctor: UserType.DOCTOR,
      technical: UserType.TECHNICAL,
    };
    return this.usersService.createUser({
      fullname: body.fullname,
      email: body.email,
      password: body.password,
      address: body.address,
      type: typeMap[body.role] ?? UserType.DOCTOR,
      status: Status.ACTIVE,
    });
  }

  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { fullname?: string; email?: string; address?: string },
  ) {
    return this.usersService.updateUser(id, body);
  }

  @Patch(':id/password')
  changePassword(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { password: string },
  ) {
    return this.usersService.changePassword(id, body.password);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { status: Status },
  ) {
    return this.usersService.updateStatus(id, body.status);
  }
}
