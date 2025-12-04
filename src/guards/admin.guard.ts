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
    // 환경변수로 기능 비활성화 가능 (기본값: true - 활성화)
    // DB_INTERNAL_ENABLED가 명시적으로 "false"로 설정된 경우에만 비활성화
    const isEnabled = this.configService.get<string>(
      "DB_INTERNAL_ENABLED",
      "true"  // 기본값을 true로 변경
    );
    if (isEnabled === "false") {
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
      let decoded: string;
      try {
        decoded = Buffer.from(token, 'base64').toString('utf-8');
      } catch (decodeError) {
        throw new UnauthorizedException("Invalid token encoding");
      }
      
      const parts = decoded.split(':');
      if (parts.length !== 2) {
        throw new UnauthorizedException("Invalid token format");
      }
      
      const [email, password] = parts;
      
      if (!email || !password) {
        throw new UnauthorizedException("Invalid token format: missing email or password");
      }

      const emailLower = email.toLowerCase().trim();
      const passwordTrimmed = password.trim();

      // 사용자 인증
      const expectedPassword = ADMIN_USERS[emailLower];
      if (!expectedPassword) {
        throw new UnauthorizedException("User not found");
      }
      
      if (expectedPassword !== passwordTrimmed) {
        throw new UnauthorizedException("Invalid password");
      }

      // 인증 성공 - 사용자 정보를 request에 저장
      request.user = { email: emailLower };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // 디버깅을 위한 로그 (운영 환경에서는 제거 가능)
      console.error('AdminGuard authentication error:', error);
      throw new UnauthorizedException("Invalid authentication token: " + (error instanceof Error ? error.message : String(error)));
    }
  }
}

