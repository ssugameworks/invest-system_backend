import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../../users/entity/user.entity";
import { CompetitionTeam } from "../../teams/entity/team.entity";

export type InvestmentType = "buy" | "sell";

@Entity("investment_history")
@Index(["user_id"])
@Index(["created_at"])
@Index(["team_id", "created_at"]) // 가격 계산 쿼리 최적화
@Index(["team_id", "type", "created_at"]) // 가격 계산 쿼리 최적화 (type 필터 포함)
@Index(["idempotency_key"], { unique: true, where: "idempotency_key IS NOT NULL" }) // 중복 체결 방지
export class InvestmentHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "user_id" })
  user_id!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "team_id" })
  team_id!: number;

  @ManyToOne(() => CompetitionTeam, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: CompetitionTeam;

  @Column({ type: "varchar", length: 10 })
  type!: InvestmentType;

  @Column({ type: "integer" })
  amount!: number;

  @Column({ type: "integer" })
  price!: number;

  @Column({ type: "numeric", precision: 18, scale: 6 })
  shares!: number;

  @Column({ name: "idempotency_key", type: "varchar", length: 255, nullable: true, unique: true })
  idempotency_key?: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}

