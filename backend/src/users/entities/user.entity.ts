import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum Role {
  User = 'user',
  Admin = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  // Sempre armazenado em minúsculas pelo serviço.
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  // Nulo para conta criada só pelo Google.
  @Column({ type: 'varchar', nullable: true })
  passwordHash: string | null;

  // Identificador (sub) da conta Google; nunca retornado pela API.
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  googleId: string | null;

  @Column({ type: 'enum', enum: Role, default: Role.User })
  role: Role;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
