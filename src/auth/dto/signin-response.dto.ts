import { ApiProperty } from "@nestjs/swagger";

export class SignInResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", description: "JWT access token" })
  accessToken!: string;

  @ApiProperty({ example: 1, description: "User ID" })
  userId!: number;

  @ApiProperty({ example: "멋진 호랑이", description: "User nickname" })
  nickname!: string;
}

