import { Controller, Get, Req, Post, Body, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthHeaderGuard } from "../guards/auth-header.guard";
import { UserService } from "./user.service";
import { User as IUser } from "./interfaces/user.interface";
import { UserResponseDto } from "./dto/user-response.dto";
import { plainToInstance } from "class-transformer";
import { CreateUserDto } from "./dto/create-user.dto";
import { User as UserEntity } from "./entity/user.entity";

@ApiTags("User")
@Controller("api")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("user")
  @UseGuards(AuthHeaderGuard)
  @ApiBearerAuth("bearer")
  @ApiOkResponse({ description: "User info", type: UserResponseDto })
  async getUser(@Req() req: any): Promise<UserResponseDto> {
    const authorization =
      req?.headers?.authorization ?? req?.headers?.Authorization;
    const user = await this.userService.getUserByAuthorization(authorization);
    return plainToInstance(UserResponseDto, user);
  }
}
