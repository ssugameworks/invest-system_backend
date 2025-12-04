import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// 관리자 사용자 정보
const ADMIN_USERS: Record<string, string> = {
  "jeff728728@gmail.com": "050728",
  "chili.tomat0@icloud.com": "010503",
  "skgus09051234@gmail.com": "050905",
  "leegaeun9243@gmail.com": "041025",
  "kangnets88@gmail.com": "051123",
  "fjune0140@gmail.com": "030312",
  "eunshenghwang@gmail.com": "040727",
  "yuninam2128@gmail.com": "050121",
};

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    // 환경변수로 기능 비활성화 가능
    const isEnabled = this.configService.get<string>(
      "DB_INTERNAL_ENABLED",
      "false"
    );
    if (isEnabled !== "true") {
      throw new ForbiddenException("DB Internal feature is disabled");
    }

    const request = context.switchToHttp().getRequest();
    
    // 추가 보안 헤더 검증 (X-Admin-Key) - 선택적
    const adminKey = request.headers["x-admin-key"] || request.headers["X-Admin-Key"];
    const requiredAdminKey = this.configService.get<string>("DB_INTERNAL_ADMIN_KEY");
    
    if (requiredAdminKey) {
      if (!adminKey || adminKey !== requiredAdminKey) {
        throw new ForbiddenException("Invalid admin key");
      }
    }

    const authHeader: string | undefined =
      request.headers["authorization"] || request.headers["Authorization"];

    if (!authHeader || typeof authHeader !== "string") {
      throw new UnauthorizedException("Missing Authorization header");
    }

    const isBearer = authHeader.startsWith("Bearer ");
    if (!isBearer) {
      throw new UnauthorizedException(
        "Authorization header must be Bearer token"
      );
    }

    const token = authHeader.substring("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedException("Empty Bearer token");
    }

    // 토큰 형식: "email:password" (base64 인코딩)
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [email, password] = decoded.split(':');
      
      if (!email || !password) {
        throw new UnauthorizedException("Invalid token format");
      }

      // 사용자 인증
      const expectedPassword = ADMIN_USERS[email.toLowerCase().trim()];
      if (!expectedPassword || expectedPassword !== password.trim()) {
        throw new UnauthorizedException("Invalid email or password");
      }

      // 인증 성공 - 사용자 정보를 request에 저장
      request.user = { email: email.toLowerCase().trim() };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid authentication token");
    }
  }
}

