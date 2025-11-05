import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { SignUpDto } from "./dto/signup.dto";
import { SignUpResponseDto } from "./dto/signup-response.dto";

@ApiTags("Auth")
@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Sign up and get an access token" })
  @ApiCreatedResponse({ type: SignUpResponseDto, description: "Access token" })
  async signUp(@Body() body: SignUpDto): Promise<SignUpResponseDto> {
    const token = await this.authService.signUp(body);
    return { accessToken: token };
  }
}


