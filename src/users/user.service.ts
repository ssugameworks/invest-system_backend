import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User as IUser } from "./interfaces/user.interface";
import { User as UserEntity } from "./entity/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import * as bcrypt from "bcrypt";
import { randomInt } from "crypto";

function generateRandomName(): string {
  const adjectives = [
    "멋진",
    "빠른",
    "조용한",
    "화려한",
    "용감한",
    "영리한",
    "상냥한",
    "든든한",
    "기쁜",
    "당당한",
    "따뜻한",
    "차분한",
    "강인한",
    "정직한",
    "사려깊은",
    "명랑한",
    "유쾌한",
    "단단한",
    "부지런한",
    "창의적인",
    "세심한",
    "열정적인",
    "대담한",
    "신속한",
    "강렬한",
    "섬세한",
    "노련한",
    "부드러운",
    "활발한",
    "기민한",
    "자신있는",
    "우아한",
    "깔끔한",
    "견고한",
    "참신한",
    "솜씨좋은",
    "영감을주는",
    "믿음직한",
    "정교한",
    "균형잡힌",
    "평온한",
    "강력한",
    "빛나는",
    "생기있는",
    "명확한",
    "단호한",
    "유능한",
    "활기찬",
    "튼튼한",
    "섬광같은",
  ];
  const animals = [
    "호랑이",
    "사자",
    "독수리",
    "늑대",
    "표범",
    "곰",
    "여우",
    "수달",
    "돌고래",
    "펭귄",
    "부엉이",
    "매",
    "치타",
    "재규어",
    "하이에나",
    "물소",
    "코끼리",
    "코뿔소",
    "기린",
    "고래",
    "참새",
    "비둘기",
    "앵무새",
    "까치",
    "두루미",
    "수리부엉이",
    "여치",
    "사슴",
    "고라니",
    "너구리",
    "두더지",
    "너트리아",
    "바다사자",
    "해달",
    "문어",
    "상어",
    "가마우지",
    "카멜레온",
    "이구아나",
    "거북이",
    "판다",
    "캥거루",
    "코알라",
    "다람쥐",
    "스컹크",
    "오소리",
    "고양이",
    "강아지",
    "토끼",
    "두껍이",
  ];
  const adj = adjectives[randomInt(adjectives.length)];
  const animal = animals[randomInt(animals.length)];
  return `${adj} ${animal}`;
}

async function generateUniqueName(
  repo: Repository<UserEntity>,
  maxAttempts = 50
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateRandomName();
    const exists = await repo.exist({ where: { name: candidate } });
    if (!exists) return candidate;
  }
  // fallback: append numeric suffix to break ties
  return `${generateRandomName()} ${randomInt(1000, 10000)}`;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>
  ) {}

  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    const hashed = await bcrypt.hash(dto.password, 10);
    const uniqueName = await generateUniqueName(this.userRepo);
    const user = this.userRepo.create({
      name: uniqueName,
      schoolNumber: dto.schoolNumber,
      department: dto.department,
      password: hashed,
      capital: 0,
      roi: 0,
      rank: 0,
    } as any);
    return await this.userRepo.save(user as any);
  }

  private extractToken(authorization?: string): string {
    if (!authorization || typeof authorization !== "string") {
      throw new UnauthorizedException("Missing Authorization header");
    }
    if (!authorization.startsWith("Bearer ")) {
      throw new UnauthorizedException(
        "Authorization header must be Bearer token"
      );
    }
    const token = authorization.substring("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedException("Empty Bearer token");
    }
    return token;
  }

  async getUserByAuthorization(authorization?: string): Promise<IUser> {
    const token = this.extractToken(authorization);
    const entity = await this.userRepo.findOne({
      where: { accessToken: token },
    });
    if (!entity) {
      throw new UnauthorizedException("Invalid token");
    }
    return {
      name: entity.name,
      schoolNumber: entity.schoolNumber,
      department: entity.department,
      capital: entity.capital ?? 0,
      roi: entity.roi ?? 0,
      rank: entity.rank ?? 0,
    };
  }
}
