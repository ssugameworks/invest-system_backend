import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { CommentEntity } from "./entity/comment.entity";
import { CompetitionTeam } from "../teams/entity/team.entity";
import { CreateCommentDto } from "./dto/create-comment.dto";

export interface GetTeamCommentsParams {
  teamId: number;
  limit?: number;
  cursor?: string; // ISO string
  mode?: "preview" | "default";
}

export interface TeamCommentsResponse<T = CommentEntity> {
  items: T[];
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentsRepo: Repository<CommentEntity>,
    @InjectRepository(CompetitionTeam)
    private readonly teamsRepo: Repository<CompetitionTeam>,
  ) {}

  private resolveLimit(mode?: "preview" | "default", rawLimit?: number): number {
    if (mode === "preview") return 3;
    const base = rawLimit ?? 7;
    if (base < 1) return 1;
    if (base > 50) return 50;
    return base;
  }

  async getTeamComments(
    params: GetTeamCommentsParams,
  ): Promise<TeamCommentsResponse> {
    const { teamId, mode, cursor } = params;
    const limit = this.resolveLimit(mode, params.limit);

    const team = await this.teamsRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    let qb: SelectQueryBuilder<CommentEntity> = this.commentsRepo
      .createQueryBuilder("c")
      .where("c.team_id = :teamId", { teamId })
      .orderBy("c.created_at", "DESC")
      .addOrderBy("c.id", "DESC")
      .limit(limit);

    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        qb = qb.andWhere("c.created_at < :cursor", { cursor: cursorDate.toISOString() });
      }
    }

    const items = await qb.getMany();
    const count = items.length;
    const hasMore = count === limit;
    const nextCursor = count > 0 ? items[items.length - 1].created_at.toISOString() : null;

    return { items, count, hasMore, nextCursor };
  }

  async createTeamComment(teamId: number, dto: CreateCommentDto): Promise<CommentEntity> {
    const team = await this.teamsRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    const entity = this.commentsRepo.create({
      team_id: teamId,
      author_id: dto.author_id,
      body: dto.body,
    });

    return await this.commentsRepo.save(entity);
  }
}


