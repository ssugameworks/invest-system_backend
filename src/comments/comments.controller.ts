import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  getSchemaPath,
  ApiExtraModels,
} from "@nestjs/swagger";
import { CommentsService } from "./comments.service";
import { AuthHeaderGuard } from "../guards/auth-header.guard";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { CommentEntity } from "./entity/comment.entity";

@ApiTags("Comments")
@ApiExtraModels(CommentEntity)
@Controller("teams/:teamId/comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: "팀 코멘트 목록 조회" })
  @ApiParam({ name: "teamId", type: Number, example: 10 })
  @ApiQuery({
    name: "limit",
    required: false,
    example: 7,
    description: "기본 7, 프리뷰 3, 최대 50",
  })
  @ApiQuery({
    name: "cursor",
    required: false,
    example: "2025-11-03T12:34:56.000Z",
  })
  @ApiQuery({
    name: "mode",
    required: false,
    example: "default",
    enum: ["preview", "default"],
  })
  @ApiOkResponse({
    description: "코멘트 목록",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: { $ref: getSchemaPath(CommentEntity) },
          example: [
            {
              id: 1,
              team_id: 10,
              author_id: 123,
              body: "Great work!",
              created_at: "2025-11-03T12:34:56.000Z",
              updated_at: "2025-11-03T12:34:56.000Z",
            },
          ],
        },
        count: { type: "number", example: 1 },
        hasMore: { type: "boolean", example: false },
        nextCursor: { type: "string", nullable: true, example: null },
      },
    },
  })
  async getTeamComments(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query("limit") limit?: number,
    @Query("cursor") cursor?: string,
    @Query("mode") mode?: "preview" | "default"
  ) {
    const parsedLimit =
      limit !== undefined
        ? parseInt(limit as unknown as string, 10)
        : undefined;
    return this.commentsService.getTeamComments({
      teamId,
      limit: parsedLimit,
      cursor,
      mode,
    });
  }

  @Post()
  @UseGuards(AuthHeaderGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "팀 코멘트 등록" })
  @ApiParam({ name: "teamId", type: Number, example: 10 })
  @ApiBody({
    type: CreateCommentDto,
    examples: {
      default: {
        summary: "예시",
        value: { author_id: 123, body: "Great work!" },
      },
    },
  })
  @ApiCreatedResponse({
    description: "생성된 코멘트",
    schema: {
      allOf: [{ $ref: getSchemaPath(CommentEntity) }],
      example: {
        id: 1,
        team_id: 10,
        author_id: 123,
        body: "Great work!",
        created_at: "2025-11-03T12:34:56.000Z",
        updated_at: "2025-11-03T12:34:56.000Z",
      },
    },
  })
  async createTeamComment(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() dto: CreateCommentDto
  ) {
    return this.commentsService.createTeamComment(teamId, dto);
  }
}
