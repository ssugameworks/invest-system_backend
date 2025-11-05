import {
  Body,
  Controller,
  Req,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { InvestService } from "./invest.service";
import { InvestRequestDto } from "./dto/invest-request.dto";
import { InvestResponseDto } from "./dto/invest-response.dto";
import { AuthHeaderGuard } from "../guards/auth-header.guard";

@ApiTags("Invest")
@Controller("api")
export class InvestController {
  constructor(private readonly investService: InvestService) {}

  @Post("invest")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthHeaderGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "투자 실행" })
  @ApiCreatedResponse({ type: InvestResponseDto })
  async invest(
    @Body() body: InvestRequestDto,
    @Req() req: any
  ): Promise<InvestResponseDto> {
    const authorization =
      req?.headers?.authorization ?? req?.headers?.Authorization;
    return this.investService.invest(body, authorization);
  }
}
