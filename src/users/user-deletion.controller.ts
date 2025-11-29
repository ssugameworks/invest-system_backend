import {
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  Body,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiBody,
} from "@nestjs/swagger";
import { UserDeletionService } from "./user-deletion.service";
import { AuthHeaderGuard } from "../guards/auth-header.guard";

@ApiTags("User")
@Controller("api/user")
@UseGuards(AuthHeaderGuard)
@ApiBearerAuth("bearer")
export class UserDeletionController {
  constructor(private readonly deletionService: UserDeletionService) {}

  @Delete(":id")
  @ApiOperation({
    summary: "사용자 삭제 (투자금 환불 포함)",
    description: "사용자를 삭제하고 투자한 모든 금액을 각 팀에서 차감합니다.",
  })
  @ApiParam({ name: "id", type: Number, example: 1 })
  @ApiOkResponse({
    description: "삭제 성공",
    schema: {
      example: {
        message: "사용자 멋진 호랑이(20241814)이 삭제되었습니다.",
        refundedAmount: 15000,
      },
    },
  })
  async deleteUser(@Param("id", ParseIntPipe) id: number) {
    return await this.deletionService.deleteUser(id);
  }

  @Delete("batch/delete")
  @ApiOperation({
    summary: "여러 사용자 일괄 삭제",
    description: "여러 사용자를 한 번에 삭제하고 투자금을 환불합니다.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        userIds: {
          type: "array",
          items: { type: "number" },
          example: [1, 2, 3],
        },
      },
    },
  })
  @ApiOkResponse({
    description: "일괄 삭제 성공",
    schema: {
      example: {
        deletedCount: 3,
        totalRefund: 45000,
        details: [
          { userId: 1, refunded: 15000 },
          { userId: 2, refunded: 20000 },
          { userId: 3, refunded: 10000 },
        ],
      },
    },
  })
  async deleteUsers(@Body("userIds") userIds: number[]) {
    return await this.deletionService.deleteUsers(userIds);
  }
}

