import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from 'src/app/app.module';
import { User } from 'src/app/users/entities/user.entity';
import { Status } from 'src/context/shared/models/active.model';
import { UserType } from 'src/app/users/enums/user-type';

const SEED_USERS = [
  {
    email: 'admin@sebastian.local',
    password: 'Admin123*',
    fullname: 'Administrador Sebastian',
    type: UserType.ADMIN,
  },
  {
    email: 'technical@sebastian.local',
    password: 'Technical123*',
    fullname: 'Técnico Biomédico Sebastian',
    type: UserType.TECHNICAL,
  },
  {
    email: 'doctor@sebastian.local',
    password: 'Doctor123*',
    fullname: 'Doctor Sebastian',
    type: UserType.DOCTOR,
  },
];

async function bootstrap() {
  const logger = new Logger('SeedUsers');
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

  for (const seed of SEED_USERS) {
    const exists = await userRepo.findOne({ where: { email: seed.email } });
    if (exists) {
      logger.warn(`Usuario ya existe: ${seed.email}`);
      continue;
    }

    const hash = await bcrypt.hash(seed.password, 10);
    const user = userRepo.create({
      fullname: seed.fullname,
      email: seed.email,
      password: hash,
      type: seed.type,
      status: Status.ACTIVE,
    });

    await userRepo.save(user);
    logger.log(`Usuario creado: ${seed.email} (${seed.type})`);
  }

  await app.close();
}

bootstrap();
