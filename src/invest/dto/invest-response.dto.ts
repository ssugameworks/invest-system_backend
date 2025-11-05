import { ApiProperty } from "@nestjs/swagger";

export class InvestResponseDto {
  @ApiProperty({ example: 100000 })
  amount!: number;

  @ApiProperty({ example: "success" })
  status!: "success";

  @ApiProperty({ example: "투자가 완료되었습니다." })
  message!: string;
}
