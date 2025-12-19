import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { UserService } from "../users/user.service";

@Injectable()
export class SchoolNumberGuard implements CanActivate {
  // 허용할 학번 목록
  private readonly allowedSchoolNumbers: number[] = [20241814];

  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization: string | undefined =
      request.headers["authorization"] || request.headers["Authorization"];

    if (!authorization || typeof authorization !== "string") {
      throw new UnauthorizedException("Missing Authorization header");
    }

    try {
      // 토큰으로부터 사용자 정보 가져오기
      const user = await this.userService.getUserByAuthorization(authorization);
      
      // 허용된 학번인지 확인
      if (!this.allowedSchoolNumbers.includes(user.schoolNumber)) {
        throw new ForbiddenException("Access denied: Invalid school number");
      }

      // 사용자 정보를 request에 저장 (필요시 사용)
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid token");
    }
  }
}

