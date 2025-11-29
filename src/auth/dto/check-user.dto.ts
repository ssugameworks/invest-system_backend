import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class CheckUserDto {
  @ApiProperty({ example: 20241814, description: "Student number" })
  @Transform(({ value }) =>
    typeof value === "string" ? parseInt(value, 10) : value
  )
  @IsInt()
  @Min(1)
  schoolNumber!: number;
}

export class CheckUserResponseDto {
  @ApiProperty({ example: true, description: "사용자 존재 여부" })
  exists!: boolean;
}

