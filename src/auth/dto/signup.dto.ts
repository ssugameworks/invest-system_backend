import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsString, Min, MinLength, IsNotEmpty } from "class-validator";

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

  @ApiProperty({ example: "P@ssw0rd!", description: "Password" })
  @IsString()
  @MinLength(6)
  password!: string;
}
