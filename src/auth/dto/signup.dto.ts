import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsString, Min, MinLength, IsNotEmpty, IsOptional, Matches } from "class-validator";

export class SignUpDto {
  @ApiProperty({ example: 20241814, description: "Student number" })
  @Transform(({ value }) =>
    typeof value === "string" ? parseInt(value, 10) : value
  )
  @IsInt()
  @Min(1)
  schoolNumber!: number;

  @ApiProperty({ example: "글로벌미디어학부", description: "Department" })
  @IsString()
  @IsNotEmpty()
  department!: string;

  @ApiProperty({ example: "010-1234-5678", description: "Phone number" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, {
    message: "올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)"
  })
  phoneNumber!: string;

  @ApiProperty({ example: "P@ssw0rd!", description: "Password" })
  @IsString()
  @MinLength(6)
  password!: string;
}
