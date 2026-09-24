import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('inspection_category')
export class InspectionCategory {
  @PrimaryGeneratedColumn('uuid')
  category_id!: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  name!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'int', default: 0 })
  display_order!: number;
}
