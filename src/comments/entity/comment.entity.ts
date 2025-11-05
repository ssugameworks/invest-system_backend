import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

@Entity("team_comments")
@Index("idx_team_comments_team_id_created_at", ["team_id", "created_at"])
export class CommentEntity {
  @PrimaryGeneratedColumn()
  @ApiProperty({ example: 1 })
  id!: number;

  @Column({ type: "int" })
  @ApiProperty({ example: 10 })
  team_id!: number;

  @Column({ type: "int" })
  @ApiProperty({ example: 123 })
  author_id!: number;

  @Column({ type: "text" })
  @ApiProperty({ example: "Great work!" })
  body!: string;

  @CreateDateColumn({ type: "timestamptz" })
  @ApiProperty({ example: "2025-11-03T12:34:56.000Z" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  @ApiProperty({ example: "2025-11-03T12:34:56.000Z" })
  updated_at!: Date;
}
