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

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}

