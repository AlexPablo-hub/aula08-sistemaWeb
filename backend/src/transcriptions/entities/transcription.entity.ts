import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('transcriptions')
export class Transcription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  // Sem exclusão em cascata: remover usuário não é previsto.
  @ManyToOne(() => User, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Nome original do arquivo enviado.
  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 2, default: 'pt' })
  language: string;

  @Column({ type: 'text' })
  text: string;

  // Chave do objeto no bucket; nulo quando o áudio não foi guardado. Nunca vai para a API.
  @Column({ type: 'varchar', length: 255, nullable: true })
  audioKey: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  audioMimeType: string | null;

  // Tamanho do áudio guardado, em bytes.
  @Column({ type: 'integer', nullable: true })
  audioSize: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
