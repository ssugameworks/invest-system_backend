import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateCommentDto {
  @ApiProperty({ example: 123, description: "작성자 사용자 ID" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  author_id!: number;

  @ApiProperty({ example: "Great work!", description: "코멘트 본문" })
  @IsString()
  @IsNotEmpty()
  body!: string;
}
