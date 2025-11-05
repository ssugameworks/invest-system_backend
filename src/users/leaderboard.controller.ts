import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entity/user.entity";

class LeaderboardItemDto {
  name!: string;
  schoolNumber!: number;
  department!: string;
  capital!: number | null;
  roi!: number | null;
  rank!: number | null;
}

@ApiTags("Leaderboard")
@Controller("api")
export class LeaderboardController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>
  ) {}

  @Get("leaderboard")
  @ApiQuery({ name: "page", required: false, schema: { default: 1 } })
  @ApiQuery({ name: "pageSize", required: false, schema: { default: 20 } })
  @ApiOkResponse({ type: [LeaderboardItemDto] })
  async getLeaderboard(
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string
  ): Promise<LeaderboardItemDto[]> {
    const page = Math.max(1, Number(pageRaw ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? 20)));
    const skip = (page - 1) * pageSize;

    // 우선 rank가 설정된 순서로, 그 다음 roi 내림차순으로 정렬
    const rows = await this.userRepo
      .createQueryBuilder("u")
      .select([
        "u.name AS name",
        'u.schoolnumber AS "schoolNumber"',
        "u.department AS department",
        "u.capital AS capital",
        "u.roi AS roi",
        "u.rank AS rank",
      ])
      .orderBy("u.rank", "ASC", "NULLS LAST")
      .addOrderBy("u.roi", "DESC", "NULLS LAST")
      .offset(skip)
      .limit(pageSize)
      .getRawMany<LeaderboardItemDto>();

    return rows;
  }
}
