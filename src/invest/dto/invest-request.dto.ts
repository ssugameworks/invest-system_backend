import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsPositive } from "class-validator";

export class InvestRequestDto {
  @ApiProperty({ example: 100000, description: "투자 금액" })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: 3, description: "투자 대상 팀 ID" })
  @IsNumber()
  @IsPositive()
  teamId!: number;
}
