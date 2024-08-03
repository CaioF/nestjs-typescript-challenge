import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../models/user.entity';
import { CreateUserDto } from '../../auth/controllers/dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { Role } from '../../roles/models/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async findOneByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findOne({
      where: {
        email,
      },
    });
  }

  async findOneById(userId: number): Promise<User> {
    console.log(userId);
    return this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    createUserDto.password = await this.encryptPassword(createUserDto.password);
    const user = this.usersRepository.create(createUserDto);
    const role = await this.rolesRepository.findOne({
      where: { name: 'guest' },
    });
    user.roles = [role];
    return await this.usersRepository.save(user);
  }

  async updateRole(userId: number, roleName: string): Promise<User> {
    console.log('Received userId:', userId, 'roleName:', roleName);

    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) {
      throw new Error('User not found');
    }

    const role = await this.rolesRepository.findOne({
      where: { name: roleName },
    });
    if (!role) {
      throw new Error('Role not found');
    }

    console.log('Updating user role:', userId, 'to role:', roleName);

    user.roles = [role];
    return this.usersRepository.save(user);
  }

  async encryptPassword(password: string) {
    return await bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }
}
