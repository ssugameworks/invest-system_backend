import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";

export type TeamStatus = "upcoming" | "ongoing" | "ended";

@Entity("competition_teams")
@Index("idx_competition_teams_status", ["status"])
export class CompetitionTeam {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  teamName!: string;

  @Column({ type: "jsonb", nullable: true })
  members!: string[][];

  // 진행 상태
  @Column({ type: "varchar", length: 16, default: "upcoming" })
  status!: TeamStatus;

  // 피치 Pdf url
  @Column({ length: 255, nullable: true })
  pitch_url!: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;

  @Column({ type: "integer", nullable: true, default: 0 })
  money!: number | null;

  @Column({ name: "p", type: "integer", nullable: true })
  p!: number | null;

  @Column({ name: "p0", type: "integer", default: 1000 })
  p0!: number;

  @Column({ name: "p1", type: "integer", nullable: true })
  p1!: number | null;

  @Column({ name: "p2", type: "integer", nullable: true })
  p2!: number | null;
}
