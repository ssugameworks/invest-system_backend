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

  // ⭐ 현재 주가 (단순화: p만 사용, 기본값 1000)
  @Column({ name: "p", type: "integer", default: 1000, nullable: false })
  p!: number;

  // 현재 슬라이드 번호 (인터널에서 조종)
  @Column({ type: "integer", nullable: true, default: 1 })
  currentSlide!: number | null;
}
