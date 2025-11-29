import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../../users/entity/user.entity";
import { CompetitionTeam } from "../../teams/entity/team.entity";

@Entity("user_investments")
@Index(["user_id"])
@Index(["team_id"])
@Index(["user_id", "team_id"], { unique: true })
export class UserInvestment {
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

  @Column({ type: "numeric", precision: 18, scale: 6, default: 0 })
  shares!: number;

  @Column({ type: "integer", default: 0 })
  invested_amount!: number;

  @Column({ type: "integer", default: 0 })
  average_price!: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}

