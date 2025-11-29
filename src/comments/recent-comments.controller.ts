import { Controller, Get, Query, Post, Body, UseGuards, Req, UnauthorizedException } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiCreatedResponse, ApiBearerAuth } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CommentEntity } from "./entity/comment.entity";
import { User } from "../users/entity/user.entity";
import { AuthHeaderGuard } from "../guards/auth-header.guard";

interface CommentDto {
  id: number;
  author_id: number;
  author_name: string;
  author_department: string;
  body: string;
  created_at: Date;
  updated_at: Date;
}

interface CreateCommentDto {
  body: string;
}

@ApiTags("Comments")
@Controller("api/comments")
export class RecentCommentsController {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentsRepo: Repository<CommentEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>
  ) {}

  @Get()
  @ApiOperation({ summary: "전체 댓글 조회 (커서 페이지네이션)" })
  @ApiQuery({
    name: "limit",
    required: false,
    schema: { default: 10 },
    description: "조회할 댓글 수 (기본: 10, 최대: 50)",
  })
  @ApiQuery({
    name: "cursor",
    required: false,
    description: "페이지네이션 커서 (댓글 ID)",
  })
  @ApiOkResponse({
    description: "전체 댓글 목록",
    schema: {
      type: "object",
      properties: {
        comments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "number" },
              author_id: { type: "number" },
              author_name: { type: "string" },
              author_department: { type: "string" },
              body: { type: "string" },
              created_at: { type: "string", format: "date-time" },
              updated_at: { type: "string", format: "date-time" },
            },
          },
        },
        hasMore: { type: "boolean" },
        nextCursor: { type: "number", nullable: true },
        totalCount: { type: "number" },
      },
    },
  })
  async getComments(
    @Query("limit") limitRaw?: string,
    @Query("cursor") cursorRaw?: string
  ): Promise<{
    comments: CommentDto[];
    hasMore: boolean;
    nextCursor: number | null;
    totalCount: number;
  }> {
    const limit = Math.min(50, Math.max(1, Number(limitRaw ?? 10)));
    const cursor = cursorRaw ? Number(cursorRaw) : null;

    // 커서 기반 페이지네이션
    let query = this.commentsRepo
      .createQueryBuilder("c")
      .leftJoin(User, "u", "u.id = c.author_id")
      .select([
        "c.id as id",
        "c.author_id as author_id",
        "c.body as body",
        "c.created_at as created_at",
        "c.updated_at as updated_at",
        "u.name as author_name",
        "u.department as author_department",
      ])
      .orderBy("c.id", "DESC");

    if (cursor) {
      query = query.where("c.id < :cursor", { cursor });
    }

    query = query.limit(limit + 1); // 하나 더 가져와서 hasMore 판단

    const rawComments = await query.getRawMany();
    const totalCount = await this.commentsRepo.count();

    const hasMore = rawComments.length > limit;
    const comments = rawComments.slice(0, limit);
    const nextCursor = hasMore && comments.length > 0 ? comments[comments.length - 1].id : null;

    // 데이터 변환
    const transformedComments: CommentDto[] = comments.map((row) => ({
      id: Number(row.id),
      author_id: Number(row.author_id),
      author_name: row.author_name || `사용자${row.author_id}`,
      author_department: row.author_department || '미분류',
      body: row.body,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return {
      comments: transformedComments,
      hasMore,
      nextCursor,
      totalCount,
    };
  }

  @Post()
  @UseGuards(AuthHeaderGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "댓글 작성" })
  @ApiCreatedResponse({
    description: "작성된 댓글",
  })
  async createComment(@Body() dto: CreateCommentDto, @Req() req: any): Promise<CommentDto> {
    // 토큰에서 사용자 ID 추출
    const authorization = req?.headers?.authorization ?? req?.headers?.Authorization;
    if (!authorization || typeof authorization !== "string") {
      throw new UnauthorizedException("Missing Authorization header");
    }
    
    const token = authorization.substring("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedException("Empty Bearer token");
    }

    // 토큰으로 사용자 조회
    const user = await this.userRepo.findOne({ where: { accessToken: token } });
    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    // team_id는 0으로 설정 (전체 댓글이므로)
    const entity = this.commentsRepo.create({
      team_id: 0, // 전체 댓글은 team_id = 0
      author_id: user.id,
      body: dto.body,
    });

    const saved = await this.commentsRepo.save(entity);

    return {
      id: saved.id,
      author_id: saved.author_id,
      author_name: user.name || `사용자${saved.author_id}`,
      author_department: user.department || '미분류',
      body: saved.body,
      created_at: saved.created_at,
      updated_at: saved.updated_at,
    };
  }
}

