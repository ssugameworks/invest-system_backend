import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 60 })
  @Index({ unique: true })
  name!: string;

  @Column({ name: "schoolnumber", type: "integer", unique: true })
  @Index({ unique: true })
  schoolNumber!: number;

  @Column({ length: 60 })
  department!: string;

  @Column({ length: 120 })
  password!: string;

  @Column({ type: "varchar", length: 512, nullable: true })
  accessToken?: string;

  @Column({ type: "integer", nullable: true })
  capital!: number;

  @Column({ type: "integer", nullable: true })
  roi!: number;

  @Column({ type: "integer", nullable: true })
  rank!: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
