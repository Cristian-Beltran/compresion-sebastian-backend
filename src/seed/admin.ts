import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from 'src/app/app.module';
import { User } from 'src/app/users/entities/user.entity';
import { Status } from 'src/context/shared/models/active.model';
import { UserType } from 'src/app/users/enums/user-type';

const ADMIN_SEED = {
  email: 'admin@sebastian.local',
  password: 'Admin123*',
  fullname: 'Administrador Sebastian',
};

async function bootstrap() {
  const logger = new Logger('SeedAdmin');
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

  const email = ADMIN_SEED.email;
  const password = ADMIN_SEED.password;
  const fullname = ADMIN_SEED.fullname;

  const exists = await userRepo.findOne({ where: { email } });
  if (exists) {
    logger.warn(`Admin ya existe: ${email}`);
    await app.close();
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const admin = userRepo.create({
    fullname,
    email,
    password: hash,
    type: UserType.ADMIN,
    status: Status.ACTIVE,
  });

  await userRepo.save(admin);
  logger.log(`Admin creado: ${email}`);
  await app.close();
}

bootstrap();
