import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNumber, IsString, Min } from "class-validator";

export class UserResponseDto {
  @ApiProperty({ example: 1, description: "사용자 ID" })
  @IsInt()
  id!: number;

  @ApiProperty({ example: "멋진 담당이", description: "사용자 이름" })
  name!: string;

  @ApiProperty({ example: 20241814, description: "학번(숫자형)" })
  @IsInt()
  @Min(0)
  schoolNumber!: number;

  @ApiProperty({ example: "소프트웨어학부", description: "학과" })
  @IsString()
  department!: string;

  @ApiProperty({ example: 50000, description: "보유 현금(원, 정수)" })
  @IsInt()
  @Min(0)
  capital!: number;

  @ApiProperty({ example: 30, description: "수익률(%, 숫자형)" })
  @IsNumber()
  roi!: number;

  @ApiProperty({ example: 30, description: "랭킹(정수)" })
  @IsInt()
  @Min(1)
  rank!: number;

  @ApiProperty({ example: 80000, description: "총 자산(보유 현금 + 주식 평가액)", required: false })
  @IsInt()
  @Min(0)
  total_assets?: number;

  @ApiProperty({ example: 30000, description: "주식 평가액(원, 정수)", required: false })
  @IsInt()
  @Min(0)
  stock_value?: number;
}
