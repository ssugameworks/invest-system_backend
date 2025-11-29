import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { SignUpDto } from "./dto/signup.dto";
import { SignInDto } from "./dto/signin.dto";
import { SignUpResponseDto } from "./dto/signup-response.dto";
import { SignInResponseDto } from "./dto/signin-response.dto";
import { CheckUserDto, CheckUserResponseDto } from "./dto/check-user.dto";

@ApiTags("Auth")
@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("check-user")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "학번 존재 여부 확인" })
  @ApiOkResponse({ type: CheckUserResponseDto, description: "사용자 존재 여부" })
  async checkUser(@Body() body: CheckUserDto): Promise<CheckUserResponseDto> {
    const exists = await this.authService.checkUserExists(body.schoolNumber);
    return { exists };
  }

  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "회원가입 및 액세스 토큰 발급" })
  @ApiCreatedResponse({ type: SignUpResponseDto, description: "액세스 토큰" })
  async signUp(@Body() body: SignUpDto): Promise<SignUpResponseDto> {
    const token = await this.authService.signUp(body);
    return { accessToken: token };
  }

  @Post("signin")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "로그인 및 액세스 토큰 발급" })
  @ApiOkResponse({ type: SignInResponseDto, description: "로그인 성공" })
  async signIn(@Body() body: SignInDto): Promise<SignInResponseDto> {
    return await this.authService.signIn(body);
  }
}


