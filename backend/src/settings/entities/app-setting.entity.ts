import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Configuração global, uma linha por chave. O valor é um JSON em texto e
// nunca contém chaves de API.
@Entity('settings')
export class AppSetting {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
