import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: 20241814, description: "학번(숫자형)" })
  @IsInt()
  @Min(0)
  schoolNumber!: number;

  @ApiProperty({ example: "소프트웨어학부", description: "학과" })
  @IsString()
  @IsNotEmpty()
  department!: string;

  @ApiProperty({ example: "P@ssw0rd!", description: "로그인 비밀번호" })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
