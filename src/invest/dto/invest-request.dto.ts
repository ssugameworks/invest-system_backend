import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsPositive, IsOptional, IsString } from "class-validator";

export class InvestRequestDto {
  @ApiProperty({ example: 100000, description: "투자 금액" })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: 3, description: "투자 대상 팀 ID" })
  @IsNumber()
  @IsPositive()
  teamId!: number;

  @ApiProperty({ 
    example: "unique-key-12345", 
    description: "중복 체결 방지를 위한 고유 키 (선택적)",
    required: false 
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
