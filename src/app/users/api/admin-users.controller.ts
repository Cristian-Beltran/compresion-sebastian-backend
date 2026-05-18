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

@UseGuards(JwtAuthGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UserBaseService) {}

  @Get()
  findAll() {
    return this.usersService.findAdminsAndDoctors();
  }

  @Post()
  create(
    @Body()
    body: {
      fullname: string;
      email: string;
      password: string;
      role: 'admin' | 'doctor';
      address?: string;
    },
  ) {
    return this.usersService.createUser({
      fullname: body.fullname,
      email: body.email,
      password: body.password,
      address: body.address,
      type: body.role === 'admin' ? UserType.ADMIN : UserType.DOCTOR,
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
