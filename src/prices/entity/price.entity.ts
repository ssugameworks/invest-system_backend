import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CompetitionTeam } from "../../teams/entity/team.entity";

@Entity("prices")
@Index(["teamId", "tickTs"]) // performance index
@Index(["teamId", "round", "tickTs"], { unique: true })
export class Price {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "team_id" })
  teamId!: number;

  @ManyToOne(() => CompetitionTeam, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team!: CompetitionTeam;

  @Column({ type: "smallint" })
  round!: number; // 1 or 2

  @Column({ type: "integer" })
  price!: number;

  @Column({ name: "tick_ts", type: "timestamptz" })
  tickTs!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;
}
