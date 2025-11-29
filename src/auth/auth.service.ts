import { Injectable, ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { SignUpDto } from "./dto/signup.dto";
import { SignInDto } from "./dto/signin.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users/entity/user.entity";
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
  return `${adjectives[randomInt(adjectives.length)]} ${animals[randomInt(animals.length)]}`;
}

async function generateUniqueName(
  repo: Repository<User>,
  maxAttempts = 50
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateRandomName();
    const exists = await repo.exist({ where: { name: candidate } });
    if (!exists) return candidate;
  }
  return `${generateRandomName()} ${randomInt(1000, 10000)}`;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepo: Repository<User>
  ) {}

  async checkUserExists(schoolNumber: number): Promise<boolean> {
    return await this.userRepo.exist({
      where: { schoolNumber },
    });
  }

  async signUp(dto: SignUpDto): Promise<string> {
    const duplicated = await this.userRepo.exist({
      where: { schoolNumber: dto.schoolNumber },
    });
    if (duplicated) {
      throw new ConflictException("이미 존재하는 학번입니다.");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const name = await generateUniqueName(this.userRepo);
    const user = this.userRepo.create({
      name,
      schoolNumber: dto.schoolNumber,
      department: dto.department,
      phone_number: dto.phoneNumber,
      password: hashedPassword,
      capital: 50000, // ✅ 기본 자본금 50,000원
      roi: 0,
      rank: 0,
      total_assets: 50000, // ✅ 초기 총 자산
      stock_value: 0,
    } as any);
    const saved = await this.userRepo.save(user as any);

    const payload = { sub: saved.id, sn: saved.schoolNumber };
    const accessToken = await this.jwtService.signAsync(payload);
    await this.userRepo.update(saved.id, { accessToken });
    return accessToken;
  }

  async signIn(dto: SignInDto): Promise<{ accessToken: string; userId: number; nickname: string }> {
    const user = await this.userRepo.findOne({
      where: { schoolNumber: dto.schoolNumber },
    });

    if (!user) {
      throw new UnauthorizedException("학번 또는 비밀번호가 일치하지 않습니다.");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("학번 또는 비밀번호가 일치하지 않습니다.");
    }

    const payload = { sub: user.id, sn: user.schoolNumber };
    const accessToken = await this.jwtService.signAsync(payload);
    
    // accessToken 업데이트
    await this.userRepo.update(user.id, { accessToken });

    return {
      accessToken,
      userId: user.id,
      nickname: user.name,
    };
  }
}
