import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  Res,
  Req,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { Response, Request } from "express";
import { DbInternalService } from "./db-internal.service";
import { AdminGuard } from "../guards/admin.guard";
import { AuthHeaderGuard } from "../guards/auth-header.guard";
import { SchoolNumberGuard } from "../guards/school-number.guard";
import { PricingService } from "../pricing/pricing.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompetitionTeam, TeamStatus } from "../teams/entity/team.entity";

@ApiTags("DB Internal")
@Controller("db-internal")
export class DbInternalController {
  constructor(
    private readonly dbInternalService: DbInternalService,
    private readonly pricingService: PricingService,
    @InjectRepository(CompetitionTeam)
    private readonly teamRepo: Repository<CompetitionTeam>
  ) {}

  @Get()
  @ApiOperation({ summary: "DB Internal page" })
  getPage(@Res() res: Response) {
    try {
      const html = this.getHtmlPage();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).send("Error generating page: " + errorMessage);
    }
  }

  @Get("api/tables")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get all tables" })
  async getTables() {
    return await this.dbInternalService.getTables();
  }

  @Get("api/tables/:tableName/schema")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get table schema" })
  async getTableSchema(@Param("tableName") tableName: string) {
    return await this.dbInternalService.getTableSchema(tableName);
  }

  @Get("api/tables/:tableName/data")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get table data with pagination" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "searchColumn", required: false, type: String })
  @ApiQuery({ name: "searchValue", required: false, type: String })
  async getTableData(
    @Param("tableName") tableName: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query("searchColumn") searchColumn?: string,
    @Query("searchValue") searchValue?: string
  ) {
    return await this.dbInternalService.getTableData(
      tableName,
      page,
      limit,
      searchColumn,
      searchValue
    );
  }

  @Get("api/stats")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get database statistics" })
  async getDatabaseStats() {
    return await this.dbInternalService.getDatabaseStats();
  }

  @Get("api/tables/:tableName/rows/:id")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get row by ID" })
  async getRowById(
    @Param("tableName") tableName: string,
    @Param("id", ParseIntPipe) id: number
  ) {
    return await this.dbInternalService.getRowById(tableName, id);
  }

  @Patch("api/tables/:tableName/rows/:id")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Update row" })
  @ApiBody({ schema: { type: 'object' } })
  async updateRow(
    @Param("tableName") tableName: string,
    @Param("id", ParseIntPipe) id: number,
    @Body() updates: Record<string, any>
  ) {
    await this.dbInternalService.updateRow(tableName, id, updates);
    return { success: true, message: 'Row updated successfully' };
  }

  @Delete("api/tables/:tableName/rows/:id")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Delete row" })
  async deleteRow(
    @Param("tableName") tableName: string,
    @Param("id", ParseIntPipe) id: number
  ) {
    await this.dbInternalService.deleteRow(tableName, id);
    return { success: true, message: 'Row deleted successfully' };
  }

  @Get("api/pricing/config")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get pricing configuration" })
  async getPricingConfig() {
    return await this.dbInternalService.getPricingConfig();
  }

  @Patch("api/pricing/config")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Update pricing configuration" })
  @ApiBody({ schema: { type: 'object', properties: {
    N: { type: 'number' },
    T: { type: 'number' },
    P0: { type: 'number' },
    C: { type: 'number' },
    GAMMA: { type: 'number' },
    L: { type: 'number' },
    U: { type: 'number' }
  }}})
  async updatePricingConfig(@Body() updates: Record<string, number>) {
    await this.dbInternalService.updatePricingConfig(updates);
    return { success: true, message: 'Pricing configuration updated successfully' };
  }

  @Get("api/server/metrics")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get server metrics" })
  async getServerMetrics() {
    return await this.dbInternalService.getServerMetrics();
  }

  @Post("api/auth/login")
  @ApiOperation({ summary: "Login with email and password" })
  @ApiBody({ schema: { type: 'object', properties: {
    email: { type: 'string' },
    password: { type: 'string' }
  }, required: ['email', 'password'] }})
  async login(@Body() body: { email: string; password: string }, @Res() res: Response) {
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

    const email = body.email?.toLowerCase().trim();
    const password = body.password?.trim();

    if (!email || !password) {
      throw new UnauthorizedException("Email and password are required");
    }

    const expectedPassword = ADMIN_USERS[email];
    if (!expectedPassword || expectedPassword !== password) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // 토큰 생성: "email:password"를 base64로 인코딩
    const token = Buffer.from(`${email}:${password}`).toString('base64');
    
    // CORS 헤더는 NestJS의 CORS 설정을 따르므로 여기서 설정하지 않음
    // (main.ts의 CORS 설정이 적용됨)
    
    return res.json({
      success: true,
      token: token,
      email: email
    });
  }

  @Patch("api/teams/:teamId/price")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Update team price manually" })
  @ApiBody({ schema: { type: 'object', properties: {
    p: { type: 'number' },
    p0: { type: 'number' },
    p1: { type: 'number' },
    p2: { type: 'number' },
    money: { type: 'number' }
  }}})
  async updateTeamPrice(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() updates: { p?: number; p0?: number; p1?: number; p2?: number; money?: number }
  ) {
    await this.dbInternalService.updateTeamPrice(teamId, updates);
    return { success: true, message: 'Team price updated successfully' };
  }

  @Post("api/pricing/recalculate")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Trigger price recalculation immediately" })
  async recalculatePrices() {
    try {
      await this.pricingService.recalcEvery10s();
      return { success: true, message: 'Price recalculation completed' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error('Failed to recalculate prices: ' + errorMessage);
    }
  }

  @Get("api/teams")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get all teams" })
  async getTeams() {
    const teams = await this.teamRepo.find({
      order: { id: "ASC" },
    });
    return teams;
  }

  @Get("api/teams/ongoing")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get ongoing team" })
  async getOngoingTeam() {
    const team = await this.teamRepo.findOne({
      where: { status: "ongoing" },
      order: { updated_at: "DESC" },
    });
    return team;
  }

  @Patch("api/teams/:teamId/status")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Update team status" })
  @ApiBody({ schema: { type: 'object', properties: {
    status: { type: 'string', enum: ['upcoming', 'ongoing', 'ended'] }
  }, required: ['status'] }})
  async updateTeamStatus(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body("status") status: TeamStatus
  ) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("팀을 찾을 수 없습니다.");
    }

    // ongoing으로 변경할 때, 다른 팀들의 상태를 ended로 변경
    if (status === "ongoing") {
      await this.teamRepo.update(
        { status: "ongoing" },
        { status: "ended" }
      );
    }

    team.status = status;
    await this.teamRepo.save(team);
    return { success: true, team };
  }

  @Get("api/teams/:teamId/current-slide")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get current slide number" })
  async getCurrentSlide(@Param("teamId", ParseIntPipe) teamId: number) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("팀을 찾을 수 없습니다.");
    }
    return { currentSlide: team.currentSlide || 1 };
  }

  @Get("api/investment/overview")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get investment overview" })
  async getInvestmentOverview() {
    return await this.dbInternalService.getInvestmentOverview();
  }

  @Get("api/trading/status")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get trading status (enabled/disabled)" })
  async getTradingStatus() {
    return { 
      tradingEnabled: this.dbInternalService.isTradingEnabled(),
      message: this.dbInternalService.isTradingEnabled() 
        ? '거래가 활성화되어 있습니다.' 
        : '⚠️ 거래가 중단되어 있습니다!'
    };
  }

  @Post("api/trading/toggle")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Toggle trading status (enable/disable)" })
  @ApiBody({ schema: { type: 'object', properties: {
    enabled: { type: 'boolean' }
  }, required: ['enabled'] }})
  async toggleTrading(@Body("enabled") enabled: boolean) {
    this.dbInternalService.setTradingEnabled(enabled);
    return { 
      success: true, 
      tradingEnabled: enabled,
      message: enabled 
        ? '거래가 활성화되었습니다.' 
        : '⚠️ 거래가 중단되었습니다!'
    };
  }

  @Get("api/monitoring/realtime")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get realtime monitoring data" })
  async getRealtimeMonitoring() {
    return await this.dbInternalService.getRealtimeMonitoring();
  }

  @Get("api/investors/rankings")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get investor rankings" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getInvestorRankings(
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number
  ) {
    return await this.dbInternalService.getInvestorRankings(limit);
  }

  @Post("api/teams/:teamId/current-slide")
  @UseGuards(AdminGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Update current slide number" })
  @ApiBody({ schema: { type: 'object', properties: {
    currentSlide: { type: 'number' }
  }, required: ['currentSlide'] }})
  async updateCurrentSlide(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body("currentSlide") currentSlide: number
  ) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("팀을 찾을 수 없습니다.");
    }
    team.currentSlide = currentSlide;
    await this.teamRepo.save(team);
    return { success: true, currentSlide };
  }

  @Get("api/competition/results")
  @UseGuards(SchoolNumberGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get competition results (team rankings) - Only for specific school numbers" })
  @ApiQuery({ name: "type", required: false, enum: ["grand", "excellent", "good", "encouragement"], description: "Award type: grand(대상), excellent(최우수상), good(우수상), encouragement(장려상)" })
  async getCompetitionResults(@Query("type") type?: string) {
    return await this.dbInternalService.getCompetitionResults(type || 'grand');
  }

  private getHtmlPage(): string {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DB 인터널</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="bg-gray-50">
  <div id="app" class="min-h-screen p-4">
    <div class="max-w-7xl mx-auto">
      <div id="login-screen" class="min-h-screen flex items-center justify-center">
        <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 class="text-2xl font-bold mb-6 text-gray-900 text-center">DB 인터널 로그인</h1>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">이메일</label>
              <input
                type="email"
                id="email-input"
                placeholder="이메일을 입력하세요"
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onkeypress="if(event.key==='Enter') document.getElementById('password-input').focus()"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">생년월일 (6자리)</label>
              <input
                type="password"
                id="password-input"
                placeholder="생년월일 6자리 (예: 050728)"
                maxlength="6"
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onkeypress="if(event.key==='Enter') handleLogin()"
              />
            </div>
            <button
              onclick="handleLogin()"
              class="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              로그인
            </button>
            <p class="text-xs text-gray-500 text-center">
              등록된 관리자 이메일과 생년월일을 입력하세요.
            </p>
          </div>
        </div>
      </div>
      
      <div id="main-screen" class="hidden">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold text-gray-900">DB 인터널</h1>
          <button
            onclick="handleLogout()"
            class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            로그아웃
          </button>
        </div>

vmf        <!-- 🔴 실시간 모니터링 및 거래 중단 섹션 -->
        <div id="realtime-monitoring-section" class="bg-white rounded-lg shadow p-6 mb-6 border-2 border-blue-200">
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-semibold">🎯 실시간 대회 모니터링</h2>
              <span id="monitoring-status" class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                정상
              </span>
            </div>
            <div class="flex items-center gap-3">
              <span id="trading-status-badge" class="px-4 py-2 rounded-lg text-sm font-bold bg-green-500 text-white">
                거래 활성화
              </span>
              <button
                id="trading-toggle-btn"
                onclick="toggleTrading()"
                class="px-4 py-2 rounded-lg font-semibold transition-all bg-red-500 text-white hover:bg-red-600"
              >
                🛑 투자 중단
              </button>
            </div>
          </div>
          
          <!-- 핵심 지표 -->
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
            <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p class="text-xs text-gray-600 mb-1">TPS (초당 거래)</p>
              <p id="current-tps" class="text-2xl font-bold text-blue-600">0.00</p>
            </div>
            <div class="p-4 bg-green-50 rounded-lg border border-green-200">
              <p class="text-xs text-gray-600 mb-1">성공률 (5분)</p>
              <p id="success-rate" class="text-2xl font-bold text-green-600">100%</p>
            </div>
            <div class="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p class="text-xs text-gray-600 mb-1">매수 (5분)</p>
              <p id="buy-count" class="text-2xl font-bold text-purple-600">0</p>
            </div>
            <div class="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p class="text-xs text-gray-600 mb-1">매도 (5분)</p>
              <p id="sell-count" class="text-2xl font-bold text-orange-600">0</p>
            </div>
            <div class="p-4 bg-red-50 rounded-lg border border-red-200">
              <p class="text-xs text-gray-600 mb-1">에러 (5분)</p>
              <p id="error-count" class="text-2xl font-bold text-red-600">0</p>
            </div>
            <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p class="text-xs text-gray-600 mb-1">DB 연결</p>
              <p id="db-connections" class="text-2xl font-bold text-gray-600">0</p>
            </div>
          </div>

          <!-- 경고 메시지 영역 -->
          <div id="warning-messages" class="hidden p-4 bg-yellow-50 rounded-lg border border-yellow-200 mb-4">
            <p class="text-sm font-semibold text-yellow-800">⚠️ 주의사항</p>
            <ul id="warning-list" class="text-sm text-yellow-700 mt-1 list-disc list-inside"></ul>
          </div>

          <!-- 거래 중단 확인 모달 -->
          <div id="trading-confirm-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 id="trading-confirm-title" class="text-xl font-bold mb-4 text-red-600">🛑 거래를 중단하시겠습니까?</h3>
              <p id="trading-confirm-message" class="text-gray-600 mb-6">
                모든 사용자의 매수/매도가 차단됩니다. 긴급 상황에서만 사용하세요.
              </p>
              <div class="flex gap-3">
                <button
                  id="trading-confirm-btn"
                  onclick="confirmToggleTrading()"
                  class="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-semibold"
                >
                  확인
                </button>
                <button
                  onclick="closeToggleModal()"
                  class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>

        <div id="stats-section" class="bg-white rounded-lg shadow p-4 mb-6 hidden">
          <h2 class="text-xl font-semibold mb-3">데이터베이스 통계</h2>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <p class="text-sm text-gray-600">총 테이블 수</p>
              <p id="total-tables" class="text-2xl font-bold">-</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">총 행 수</p>
              <p id="total-rows" class="text-2xl font-bold">-</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">데이터베이스 크기</p>
              <p id="db-size" class="text-2xl font-bold">-</p>
            </div>
          </div>
        </div>

        <!-- 주가 관리 섹션 -->
        <div class="bg-white rounded-lg shadow p-4 mb-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">주가 관리</h2>
            <button
              onclick="recalculatePrices()"
              class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              주가 즉시 재계산
            </button>
          </div>
          
          <!-- 가격 설정 변수 -->
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-lg font-semibold">가격 설정 변수</h3>
              <button
                onclick="savePricingConfig()"
                class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                설정 저장
              </button>
            </div>
            <div id="pricing-config" class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">N (참가자 수)</label>
                <input type="number" id="config-N" step="1" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
                <p class="text-xs text-gray-500 mt-1">기본값: 100명</p>
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">P0 (초기 가격)</label>
                <input type="number" id="config-P0" step="1" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">L (최소 배수)</label>
                <input type="number" id="config-L" step="0.01" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
                <p class="text-xs text-gray-500 mt-1">기본값: 0.6 (40% 하락)</p>
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">U (최대 배수)</label>
                <input type="number" id="config-U" step="0.01" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
                <p class="text-xs text-gray-500 mt-1">기본값: 15.0 (15배 상승)</p>
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">GAMMA (압축 계수)</label>
                <input type="number" id="config-GAMMA" step="0.01" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
                <p class="text-xs text-gray-500 mt-1">기본값: 0.55</p>
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">C (개인 초기 자본)</label>
                <input type="number" id="config-C" step="1" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
                <p class="text-xs text-gray-500 mt-1">기본값: 45,000원</p>
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">T (팀 수)</label>
                <input type="number" id="config-T" step="1" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
                <p class="text-xs text-gray-500 mt-1">기본값: 6개</p>
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">매수 주가 민감도</label>
                <input type="number" id="config-BUY_PRICE_CHANGE_PER_WON" step="0.0001" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
                <p class="text-xs text-gray-500 mt-1">기본값: 0.00001 (매수 1원당 주가 상승량)</p>
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">매도 주가 민감도</label>
                <input type="number" id="config-SELL_PRICE_CHANGE_PER_WON" step="0.0001" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
                <p class="text-xs text-gray-500 mt-1">기본값: 0.00001 (매도 1원당 주가 하락량)</p>
              </div>
            </div>
            <div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 class="text-sm font-semibold text-blue-900 mb-2">📊 투자 시드 정보</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p class="text-gray-600">총 투자 시드</p>
                  <p id="total-seed" class="text-lg font-bold text-blue-600">-</p>
                  <p class="text-xs text-gray-500">(N × C1 = 100 × 45,000)</p>
                </div>
                <div>
                  <p class="text-gray-600">팀당 평균 투자금 (E1)</p>
                  <p id="avg-investment" class="text-lg font-bold text-blue-600">-</p>
                  <p class="text-xs text-gray-500">(총 시드 ÷ T)</p>
                </div>
                <div>
                  <p class="text-gray-600">현재 총 투자금</p>
                  <p id="current-total" class="text-lg font-bold text-blue-600">-</p>
                  <p class="text-xs text-gray-500">(모든 팀 투자금 합계)</p>
                </div>
              </div>
              <p class="text-xs text-red-600 mt-2 font-semibold">
                ⚠️ 총 투자 시드는 500만원으로 제한됩니다. 투자 시 자동으로 제한됩니다.
              </p>
            </div>
            <p class="text-xs text-gray-500 mt-2">
              * 설정을 변경한 후 "설정 저장" 버튼을 클릭하세요. 변경사항은 즉시 적용됩니다.
            </p>
          </div>

          <!-- 팀별 주가 조정 -->
          <div>
            <h3 class="text-lg font-semibold mb-2">팀별 주가 수동 조정</h3>
            <div class="flex gap-2 mb-2">
              <select id="team-select" class="flex-1 px-3 py-2 border border-gray-300 rounded-md">
                <option value="">팀 선택</option>
              </select>
              <button
                onclick="loadTeamPriceData()"
                class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                조회
              </button>
            </div>
            <div id="team-price-editor" class="hidden p-4 bg-gray-50 rounded">
              <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">현재 주가 (p)</label>
                  <input type="number" id="team-price-p" class="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">초기 주가 (p0)</label>
                  <input type="number" id="team-price-p0" class="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">라운드1 주가 (p1)</label>
                  <input type="number" id="team-price-p1" class="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">라운드2 주가 (p2)</label>
                  <input type="number" id="team-price-p2" class="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">투자 금액 (money)</label>
                  <input type="number" id="team-price-money" class="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
              <div class="mt-4 flex gap-2">
                <button
                  onclick="saveTeamPrice()"
                  class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  저장
                </button>
                <button
                  onclick="resetTeamPriceEditor()"
                  class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 투자금 현황 섹션 -->
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">투자금 현황</h2>
            <button
              onclick="loadInvestmentOverview()"
              class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              새로고침
            </button>
          </div>
          
          <!-- 전체 투자금 요약 -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p class="text-sm text-gray-600 mb-1">총 투자금</p>
              <p id="total-investment" class="text-2xl font-bold text-blue-600">-</p>
            </div>
            <div class="p-4 bg-green-50 rounded-lg border border-green-200">
              <p class="text-sm text-gray-600 mb-1">투자 한도</p>
              <p id="investment-limit" class="text-2xl font-bold text-green-600">-</p>
            </div>
            <div class="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p class="text-sm text-gray-600 mb-1">남은 용량</p>
              <p id="remaining-capacity" class="text-2xl font-bold text-yellow-600">-</p>
            </div>
            <div class="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p class="text-sm text-gray-600 mb-1">활성 투자자</p>
              <p id="active-investors" class="text-2xl font-bold text-purple-600">-</p>
              <p class="text-xs text-gray-500 mt-1">전체: <span id="total-users">-</span>명</p>
            </div>
          </div>

          <!-- 팀별 투자금 분포 -->
          <div>
            <h3 class="text-lg font-semibold mb-3">팀별 투자금 분포</h3>
            <div id="team-investments" class="space-y-3">
              <div class="p-4 text-center text-gray-500">로딩 중...</div>
            </div>
          </div>
        </div>

        <!-- 개인 투자자 순위 섹션 -->
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h2 class="text-xl font-semibold">개인 투자자 순위</h2>
              <p class="text-xs text-gray-500 mt-1">
                순위 기준: 총 자산 → 수익률 → 총 투자금 → 보유 주식 수 → 평균 매수가 → 최근 투자 시간
              </p>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="number"
                id="ranking-limit"
                value="50"
                min="10"
                max="200"
                class="w-20 px-3 py-2 border border-gray-300 rounded-md text-center"
              />
              <button
                onclick="toggleDetailColumns()"
                id="toggle-detail-btn"
                class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                세부 지표 보기
              </button>
              <button
                onclick="loadInvestorRankings()"
                class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                조회
              </button>
            </div>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-700">순위</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-700">이름</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-700">학번</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-700">학과</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-700">보유 현금</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-700">주식 평가액</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-700">총 자산</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-700">총 투자금</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-700">수익률</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 detail-column hidden">보유 주식 수</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 detail-column hidden">평균 매수가</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 detail-column hidden">투자 팀 수</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 detail-column hidden">최근 투자</th>
                </tr>
              </thead>
              <tbody id="investor-rankings-table" class="divide-y divide-gray-200">
                <tr>
                  <td colspan="9" class="px-4 py-8 text-center text-gray-500">로딩 중...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 대회 결과 발표 제어 섹션 -->
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <h2 class="text-xl font-semibold mb-4">대회 결과 발표 제어</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onclick="openAwardPage('grand')"
              class="px-6 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all font-semibold shadow-lg"
            >
              대상 결과 확인
            </button>
            <button
              onclick="openAwardPage('excellent')"
              class="px-6 py-4 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg hover:from-gray-500 hover:to-gray-600 transition-all font-semibold shadow-lg"
            >
              최우수상 결과 확인
            </button>
            <button
              onclick="openAwardPage('good')"
              class="px-6 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all font-semibold shadow-lg"
            >
              우수상 결과 확인
            </button>
            <button
              onclick="openAwardPage('encouragement')"
              class="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-semibold shadow-lg"
            >
              장려상 결과 확인
            </button>
          </div>
        </div>

        <!-- 팀 상태 관리 및 슬라이드 조종 섹션 -->
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <h2 class="text-xl font-semibold mb-4">팀 상태 관리 및 슬라이드 조종</h2>
          
          <!-- 발표 중인 팀 슬라이드 조종 -->
          <div id="ongoing-team-section" class="mb-6 p-4 bg-red-50 rounded-lg border border-red-200 hidden">
            <h3 class="text-lg font-semibold mb-3 text-red-900">발표 중인 팀: <span id="ongoing-team-name">-</span></h3>
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <button
                  onclick="changeSlide(-1)"
                  class="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  이전
                </button>
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    id="slide-input"
                    min="1"
                    class="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
                    onkeypress="if(event.key==='Enter') changeSlideToInput()"
                  />
                  <button
                    onclick="changeSlideToInput()"
                    class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                  >
                    이동
                  </button>
                </div>
                <button
                  onclick="changeSlide(1)"
                  class="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  다음
                </button>
              </div>
              <span class="text-sm text-gray-600">현재 슬라이드: <span id="current-slide-display">1</span></span>
            </div>
          </div>

          <!-- 팀 목록 및 상태 관리 -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-700">ID</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-700">팀명</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-700">현재 상태</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-700">상태 변경</th>
                </tr>
              </thead>
              <tbody id="teams-status-table" class="divide-y divide-gray-200">
                <tr>
                  <td colspan="4" class="px-4 py-8 text-center text-gray-500">로딩 중...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="bg-white rounded-lg shadow">
            <div class="p-4 border-b">
              <h2 class="text-xl font-semibold">테이블 목록</h2>
            </div>
            <div id="tables-list" class="max-h-[600px] overflow-y-auto">
              <div class="p-4 text-center text-gray-500">로딩 중...</div>
            </div>
          </div>

          <div class="lg:col-span-2">
            <div id="table-details" class="hidden space-y-6">
              <div class="bg-white rounded-lg shadow p-4">
                <h3 class="text-lg font-semibold mb-3">검색</h3>
                <div class="flex gap-2">
                  <select id="search-column" class="flex-1 px-3 py-2 border border-gray-300 rounded-md"></select>
                  <input
                    type="text"
                    id="search-value"
                    placeholder="검색어 입력"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    onkeypress="if(event.key==='Enter') handleSearch()"
                  />
                  <button onclick="handleSearch()" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">검색</button>
                  <button onclick="resetSearch()" class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 hidden" id="reset-btn">초기화</button>
                </div>
              </div>

              <div class="bg-white rounded-lg shadow">
                <div class="p-4 border-b flex justify-between items-center">
                  <h2 class="text-xl font-semibold">데이터</h2>
                  <span id="total-count" class="text-sm text-gray-600"></span>
                </div>
                <div id="table-data-content" class="overflow-x-auto max-h-[600px] overflow-y-auto"></div>
                <div id="pagination" class="p-4 border-t flex justify-between items-center hidden"></div>
              </div>
            </div>

            <!-- 수정 모달 -->
            <div id="edit-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div class="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-xl font-semibold">행 수정</h3>
                  <button onclick="closeEditModal()" class="text-gray-500 hover:text-gray-700">✕</button>
                </div>
                <div id="edit-form" class="space-y-4"></div>
                <div class="flex gap-2 mt-6">
                  <button onclick="saveEdit()" class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">저장</button>
                  <button onclick="closeEditModal()" class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">취소</button>
                </div>
              </div>
            </div>
            </div>

            <div id="no-selection" class="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              왼쪽에서 테이블을 선택하세요.
            </div>
          </div>
        </div>

        <!-- 서버 사용량 시각화 -->
        <div class="bg-white rounded-lg shadow p-6 mt-6">
          <h2 class="text-xl font-semibold mb-4">서버 사용량</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- CPU 사용량 -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700">CPU 사용률</span>
                <span id="cpu-percent" class="text-lg font-bold text-blue-600">-</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-4">
                <div id="cpu-bar" class="bg-blue-500 h-4 rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
            </div>
            <!-- 메모리 사용량 -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700">메모리 사용률</span>
                <span id="memory-percent" class="text-lg font-bold text-green-600">-</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-4">
                <div id="memory-bar" class="bg-green-500 h-4 rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                <span id="memory-used">-</span> / <span id="memory-total">-</span>
              </div>
            </div>
            <!-- 디스크 사용량 -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700">디스크 사용률</span>
                <span id="disk-percent" class="text-lg font-bold text-purple-600">-</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-4">
                <div id="disk-bar" class="bg-purple-500 h-4 rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                <span id="disk-used">-</span> / <span id="disk-total">-</span>
              </div>
            </div>
          </div>
          <!-- 네트워크 트래픽 시각화 -->
          <div class="mt-6 pt-6 border-t">
            <h3 class="text-lg font-semibold mb-4">네트워크 트래픽</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- 수신 트래픽 -->
              <div class="flex items-center gap-4">
                <div class="relative w-24 h-24">
                  <svg class="transform -rotate-90 w-24 h-24">
                    <circle cx="48" cy="48" r="40" stroke="#e5e7eb" stroke-width="8" fill="none"></circle>
                    <circle id="rx-circle" cx="48" cy="48" r="40" stroke="#3b82f6" stroke-width="8" fill="none" 
                            stroke-dasharray="251.2" stroke-dashoffset="251.2" 
                            style="transition: stroke-dashoffset 0.5s ease-out;"></circle>
                  </svg>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <span id="rx-percent" class="text-sm font-bold text-blue-600">0%</span>
                  </div>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-700 mb-1">수신 (RX)</p>
                  <p id="rx-speed" class="text-lg font-bold text-blue-600">-</p>
                  <p class="text-xs text-gray-500">총 <span id="rx-total">-</span></p>
                </div>
              </div>
              <!-- 전송 트래픽 -->
              <div class="flex items-center gap-4">
                <div class="relative w-24 h-24">
                  <svg class="transform -rotate-90 w-24 h-24">
                    <circle cx="48" cy="48" r="40" stroke="#e5e7eb" stroke-width="8" fill="none"></circle>
                    <circle id="tx-circle" cx="48" cy="48" r="40" stroke="#10b981" stroke-width="8" fill="none" 
                            stroke-dasharray="251.2" stroke-dashoffset="251.2" 
                            style="transition: stroke-dashoffset 0.5s ease-out;"></circle>
                  </svg>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <span id="tx-percent" class="text-sm font-bold text-green-600">0%</span>
                  </div>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-700 mb-1">전송 (TX)</p>
                  <p id="tx-speed" class="text-lg font-bold text-green-600">-</p>
                  <p class="text-xs text-gray-500">총 <span id="tx-total">-</span></p>
                </div>
              </div>
            </div>
          </div>
          <!-- 추가 정보 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div>
              <p class="text-xs text-gray-600">업타임</p>
              <p id="uptime" class="text-sm font-semibold">-</p>
            </div>
            <div>
              <p class="text-xs text-gray-600">프로세스 수</p>
              <p id="process-count" class="text-sm font-semibold">-</p>
            </div>
            <div>
              <p class="text-xs text-gray-600">Node.js 버전</p>
              <p id="node-version" class="text-sm font-semibold">-</p>
            </div>
            <div>
              <p class="text-xs text-gray-600">플랫폼</p>
              <p id="platform" class="text-sm font-semibold">-</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // 전역 변수 선언
    let adminToken = '';
    let currentTable = null;
    let currentPage = 1;
    let currentLimit = 50;
    let searchColumn = '';
    let searchValue = '';
    let tables = [];
    let tableSchema = [];
    let currentEditRow = null;
    let currentEditId = null;

    // API_BASE를 먼저 선언 (다른 함수들보다 먼저)
    const API_BASE = window.location.origin + '/db-internal/api';

    // localStorage에서 토큰 로드
    try {
      adminToken = localStorage.getItem('db_internal_admin_token') || '';
      if (adminToken) {
        showMainScreen();
        loadData();
      }
    } catch (e) {
      adminToken = '';
    }

    function getAuthHeaders() {
      return {
        'Authorization': 'Bearer ' + adminToken,
        'Content-Type': 'application/json'
      };
    }

    async function apiRequest(endpoint, options = {}) {
      const fetchOptions = {
        method: options.method || 'GET',
        headers: {
          ...getAuthHeaders(),
          ...(options.headers || {})
        }
      };
      
      if (options.body) {
        fetchOptions.body = options.body;
      }
      
      const response = await fetch(API_BASE + endpoint, fetchOptions);

      if (response.status === 401 || response.status === 403) {
        // 에러 응답에서 상세 메시지 가져오기
        let errorMessage = '인증이 만료되었습니다.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        console.error('Authentication error:', errorMessage, 'Status:', response.status);
        handleLogout();
        throw new Error(errorMessage);
      }

      if (!response.ok) {
        let errorMessage = '요청 실패: ' + response.status;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    }

    async function handleLogin() {
      const email = document.getElementById('email-input').value.trim();
      const password = document.getElementById('password-input').value.trim();
      
      if (!email) {
        alert('이메일을 입력해주세요.');
        return;
      }
      
      if (!password || password.length !== 6) {
        alert('생년월일 6자리를 입력해주세요.');
        return;
      }
      
      try {
        const response = await fetch(API_BASE + '/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || '로그인에 실패했습니다.');
        }
        
        const data = await response.json();
        adminToken = data.token;
        localStorage.setItem('db_internal_admin_token', adminToken);
        localStorage.setItem('db_internal_email', email);
        showMainScreen();
        loadData();
      } catch (error) {
        alert('로그인에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
      }
    }

    function handleLogout() {
      adminToken = '';
      localStorage.removeItem('db_internal_admin_token');
      localStorage.removeItem('db_internal_email');
      showLoginScreen();
    }

    function showLoginScreen() {
      document.getElementById('login-screen').classList.remove('hidden');
      document.getElementById('main-screen').classList.add('hidden');
    }

    function showMainScreen() {
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('main-screen').classList.remove('hidden');
    }

    async function loadData() {
      try {
        await Promise.all([loadStats(), loadTables(), loadServerMetrics()]);
        // 서버 사용량을 주기적으로 업데이트 (5초마다)
        setInterval(() => {
          loadServerMetrics().catch(err => console.error('Failed to load server metrics:', err));
        }, 5000);
      } catch (error) {
        console.error('Failed to load data:', error);
        alert('데이터를 불러오는데 실패했습니다: ' + error.message);
        handleLogout();
      }
    }

    async function loadServerMetrics() {
      try {
        const metrics = await apiRequest('/server/metrics');
        
        // CPU
        const cpuPercent = Math.round(metrics.cpu.usage);
        document.getElementById('cpu-percent').textContent = cpuPercent + '%';
        document.getElementById('cpu-bar').style.width = cpuPercent + '%';
        
        // 메모리 - Railway 메모리 제한(32GB) 대비 사용률 표시
        const memoryPercent = Math.round(metrics.memory.percent);
        document.getElementById('memory-percent').textContent = memoryPercent + '%';
        document.getElementById('memory-bar').style.width = memoryPercent + '%';
        document.getElementById('memory-used').textContent = formatBytes(metrics.memory.processUsed);
        document.getElementById('memory-total').textContent = formatBytes(metrics.memory.limit);
        
        // 디스크
        const diskPercent = Math.round(metrics.disk.percent);
        document.getElementById('disk-percent').textContent = diskPercent + '%';
        document.getElementById('disk-bar').style.width = diskPercent + '%';
        document.getElementById('disk-used').textContent = formatBytes(metrics.disk.used);
        document.getElementById('disk-total').textContent = formatBytes(metrics.disk.total);
        
        // 네트워크 트래픽
        if (metrics.network) {
          // 수신 트래픽 (RX)
          const rxSpeed = metrics.network.rxSpeed || 0;
          const rxTotal = metrics.network.rxBytes || 0;
          const rxSpeedFormatted = formatBytes(rxSpeed) + '/s';
          document.getElementById('rx-speed').textContent = rxSpeedFormatted;
          document.getElementById('rx-total').textContent = formatBytes(rxTotal);
          
          // 전송 트래픽 (TX)
          const txSpeed = metrics.network.txSpeed || 0;
          const txTotal = metrics.network.txBytes || 0;
          const txSpeedFormatted = formatBytes(txSpeed) + '/s';
          document.getElementById('tx-speed').textContent = txSpeedFormatted;
          document.getElementById('tx-total').textContent = formatBytes(txTotal);
          
          // 원형 차트 애니메이션
          // 최대 속도를 100MB/s로 설정 (이 값은 조정 가능)
          const maxSpeed = 100 * 1024 * 1024; // 100MB/s
          const rxPercent = Math.min(100, (rxSpeed / maxSpeed) * 100);
          const txPercent = Math.min(100, (txSpeed / maxSpeed) * 100);
          
          // 원형 차트 업데이트 (애니메이션)
          const rxCircle = document.getElementById('rx-circle');
          const txCircle = document.getElementById('tx-circle');
          const circumference = 2 * Math.PI * 40; // r=40
          const rxOffset = circumference - (rxPercent / 100) * circumference;
          const txOffset = circumference - (txPercent / 100) * circumference;
          
          rxCircle.style.strokeDashoffset = rxOffset.toString();
          txCircle.style.strokeDashoffset = txOffset.toString();
          document.getElementById('rx-percent').textContent = Math.round(rxPercent) + '%';
          document.getElementById('tx-percent').textContent = Math.round(txPercent) + '%';
        }
        
        // 기타 정보
        document.getElementById('uptime').textContent = formatUptime(metrics.uptime);
        document.getElementById('process-count').textContent = metrics.processCount || '-';
        document.getElementById('node-version').textContent = metrics.nodeVersion || '-';
        document.getElementById('platform').textContent = metrics.platform || '-';
      } catch (error) {
        console.error('Failed to load server metrics:', error);
        // 에러가 발생해도 페이지가 터지지 않도록 조용히 처리
      }
    }

    function formatBytes(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    function formatUptime(seconds) {
      if (!seconds) return '-';
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (days > 0) {
        return days + '일 ' + hours + '시간';
      } else if (hours > 0) {
        return hours + '시간 ' + minutes + '분';
      } else {
        return minutes + '분';
      }
    }

    async function loadStats() {
      try {
        const stats = await apiRequest('/stats');
        document.getElementById('stats-section').classList.remove('hidden');
        document.getElementById('total-tables').textContent = stats.totalTables;
        document.getElementById('total-rows').textContent = stats.totalRows.toLocaleString();
        document.getElementById('db-size').textContent = stats.databaseSize;
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    }

    async function loadPricingConfig() {
      try {
        const config = await apiRequest('/pricing/config');
        document.getElementById('config-N').value = config.N !== undefined && config.N !== null ? config.N : '';
        document.getElementById('config-P0').value = config.P0 !== undefined && config.P0 !== null ? config.P0 : '';
        // 통합된 변수 사용 (하위 호환성을 위해 L1, U1, C1도 지원)
        document.getElementById('config-L').value = (config.L !== undefined && config.L !== null) || (config.L1 !== undefined && config.L1 !== null) ? (config.L || config.L1) : '';
        document.getElementById('config-U').value = (config.U !== undefined && config.U !== null) || (config.U1 !== undefined && config.U1 !== null) ? (config.U || config.U1) : '';
        document.getElementById('config-GAMMA').value = config.GAMMA !== undefined && config.GAMMA !== null ? config.GAMMA : '';
        document.getElementById('config-C').value = (config.C !== undefined && config.C !== null) || (config.C1 !== undefined && config.C1 !== null) ? (config.C || config.C1) : '';
        document.getElementById('config-T').value = config.T !== undefined && config.T !== null ? config.T : '';
        // 매수/매도 민감도는 값이 있으면 표시 (0도 유효한 값이므로 !== undefined && !== null 체크)
        document.getElementById('config-BUY_PRICE_CHANGE_PER_WON').value = config.BUY_PRICE_CHANGE_PER_WON !== undefined && config.BUY_PRICE_CHANGE_PER_WON !== null ? config.BUY_PRICE_CHANGE_PER_WON : '';
        document.getElementById('config-SELL_PRICE_CHANGE_PER_WON').value = config.SELL_PRICE_CHANGE_PER_WON !== undefined && config.SELL_PRICE_CHANGE_PER_WON !== null ? config.SELL_PRICE_CHANGE_PER_WON : '';
        
        // 투자 시드 정보 업데이트
        updateInvestmentSeedInfo(config);
      } catch (error) {
        console.error('Failed to load pricing config:', error);
      }
    }

    async function updateInvestmentSeedInfo(config) {
      try {
        const N = config.N || 100;
        const C = config.C || config.C1 || 50000;
        const T = config.T || 6;
        const totalSeed = N * C;
        const avgInvestment = T > 0 ? totalSeed / T : 0;
        
        document.getElementById('total-seed').textContent = totalSeed.toLocaleString() + '원';
        document.getElementById('avg-investment').textContent = Math.round(avgInvestment).toLocaleString() + '원';
        
        // 현재 총 투자금 조회
        try {
          const teams = await apiRequest('/tables/competition_teams/data?limit=100');
          const currentTotal = teams.rows.reduce((sum, team) => sum + (team.money || 0), 0);
          document.getElementById('current-total').textContent = currentTotal.toLocaleString() + '원';
          
          // 500만원 제한 경고
          if (currentTotal > 5000000) {
            document.getElementById('current-total').classList.add('text-red-600');
            document.getElementById('current-total').classList.remove('text-blue-600');
          } else {
            document.getElementById('current-total').classList.remove('text-red-600');
            document.getElementById('current-total').classList.add('text-blue-600');
          }
        } catch (error) {
          document.getElementById('current-total').textContent = '조회 실패';
        }
      } catch (error) {
        console.error('Failed to update investment seed info:', error);
      }
    }

    async function savePricingConfig() {
      try {
        const updates = {};
        const keys = ['N', 'T', 'P0', 'C', 'GAMMA', 'L', 'U', 'BUY_PRICE_CHANGE_PER_WON', 'SELL_PRICE_CHANGE_PER_WON'];
        
        for (const key of keys) {
          const input = document.getElementById('config-' + key);
          if (input) {
            const value = input.value.trim();
            if (value !== '') {
              updates[key] = parseFloat(value);
              // 하위 호환성을 위해 C1, C2, L1, L2, U1, U2도 설정
              if (key === 'C') {
                updates.C1 = parseFloat(value);
                updates.C2 = parseFloat(value);
              } else if (key === 'L') {
                updates.L1 = parseFloat(value);
                updates.L2 = parseFloat(value);
              } else if (key === 'U') {
                updates.U1 = parseFloat(value);
                updates.U2 = parseFloat(value);
              }
            }
          }
        }

        if (Object.keys(updates).length === 0) {
          alert('변경할 값이 없습니다.');
          return;
        }

        await apiRequest('/pricing/config', {
          method: 'PATCH',
          body: JSON.stringify(updates)
        });

        alert('가격 설정이 저장되었습니다.');
        await loadPricingConfig();
        await updateInvestmentSeedInfo(updates);
      } catch (error) {
        alert('저장에 실패했습니다: ' + error.message);
      }
    }

    async function loadTeamsForPriceEditor() {
      try {
        const teams = await apiRequest('/tables/competition_teams/data?limit=100');
        const select = document.getElementById('team-select');
        select.innerHTML = '<option value="">팀 선택</option>';
        teams.rows.forEach(team => {
          const option = document.createElement('option');
          option.value = team.id;
          option.textContent = team.teamName + ' (ID: ' + team.id + ')';
          select.appendChild(option);
        });
      } catch (error) {
        console.error('Failed to load teams:', error);
      }
    }

    async function loadTeamPriceData() {
      const teamId = document.getElementById('team-select').value;
      if (!teamId) {
        alert('팀을 선택해주세요.');
        return;
      }

      try {
        const team = await apiRequest('/tables/competition_teams/rows/' + teamId);
        document.getElementById('team-price-p').value = team.p || '';
        document.getElementById('team-price-p0').value = team.p0 || '';
        document.getElementById('team-price-p1').value = team.p1 || '';
        document.getElementById('team-price-p2').value = team.p2 || '';
        document.getElementById('team-price-money').value = team.money || '';
        document.getElementById('team-price-editor').classList.remove('hidden');
      } catch (error) {
        alert('팀 데이터를 불러오는데 실패했습니다: ' + error.message);
      }
    }

    async function saveTeamPrice() {
      const teamId = document.getElementById('team-select').value;
      if (!teamId) {
        alert('팀을 선택해주세요.');
        return;
      }

      try {
        const updates = {};
        const p = document.getElementById('team-price-p').value;
        const p0 = document.getElementById('team-price-p0').value;
        const p1 = document.getElementById('team-price-p1').value;
        const p2 = document.getElementById('team-price-p2').value;
        const money = document.getElementById('team-price-money').value;

        if (p) updates.p = parseInt(p);
        if (p0) updates.p0 = parseInt(p0);
        if (p1) updates.p1 = parseInt(p1);
        if (p2) updates.p2 = parseInt(p2);
        if (money) updates.money = parseInt(money);

        await apiRequest('/teams/' + teamId + '/price', {
          method: 'PATCH',
          body: JSON.stringify(updates)
        });

        alert('팀 주가가 저장되었습니다.');
        await loadTeamPriceData();
      } catch (error) {
        alert('저장에 실패했습니다: ' + error.message);
      }
    }

    function resetTeamPriceEditor() {
      document.getElementById('team-select').value = '';
      document.getElementById('team-price-p').value = '';
      document.getElementById('team-price-p0').value = '';
      document.getElementById('team-price-p1').value = '';
      document.getElementById('team-price-p2').value = '';
      document.getElementById('team-price-money').value = '';
      document.getElementById('team-price-editor').classList.add('hidden');
    }

    async function recalculatePrices() {
      if (!confirm('모든 팀의 주가를 즉시 재계산하시겠습니까?')) {
        return;
      }

      try {
        const result = await apiRequest('/pricing/recalculate', {
          method: 'POST'
        });
        alert('주가 재계산이 완료되었습니다.');
      } catch (error) {
        alert('주가 재계산에 실패했습니다: ' + error.message);
      }
    }

    async function loadTables() {
      try {
        tables = await apiRequest('/tables');
        renderTables();
      } catch (error) {
        document.getElementById('tables-list').innerHTML = 
          '<div class="p-4 text-center text-red-500">테이블 목록을 불러오는데 실패했습니다.</div>';
      }
    }

    function renderTables() {
      const container = document.getElementById('tables-list');
      if (tables.length === 0) {
        container.innerHTML = '<div class="p-4 text-center text-gray-500">테이블이 없습니다.</div>';
        return;
      }

      container.innerHTML = tables.map(table => \`
        <div
          class="p-4 cursor-pointer hover:bg-gray-50 transition-colors \${currentTable === table.tableName ? 'bg-blue-50 border-l-4 border-blue-500' : ''}"
          onclick="selectTable('\${table.tableName}')"
        >
          <div class="font-medium text-gray-900">\${table.tableName}</div>
          <div class="text-sm text-gray-500 mt-1">\${table.rowCount.toLocaleString()} rows</div>
        </div>
      \`).join('');
    }

    async function selectTable(tableName) {
      currentTable = tableName;
      currentPage = 1;
      searchColumn = '';
      searchValue = '';
      document.getElementById('search-value').value = '';
      document.getElementById('reset-btn').classList.add('hidden');
      
      renderTables();
      document.getElementById('no-selection').classList.add('hidden');
      document.getElementById('table-details').classList.remove('hidden');
      
      try {
        // 스키마를 먼저 로드해서 검색 컬럼 목록을 가져옴
        try {
          tableSchema = await apiRequest('/tables/' + tableName + '/schema');
          const searchSelect = document.getElementById('search-column');
          searchSelect.innerHTML = '<option value="">컬럼 선택</option>' + 
            tableSchema.map(col => \`<option value="\${col.columnName}">\${col.columnName}</option>\`).join('');
        } catch (error) {
          console.error('Failed to load schema:', error);
        }
        await loadTableData(tableName);
      } catch (error) {
        console.error('Failed to load table data:', error);
        alert('테이블 데이터를 불러오는데 실패했습니다.');
      }
    }

    async function loadTableData(tableName, page = 1) {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: currentLimit.toString()
        });
        if (searchColumn && searchValue) {
          params.append('searchColumn', searchColumn);
          params.append('searchValue', searchValue);
        }
        
        const data = await apiRequest('/tables/' + tableName + '/data?' + params.toString());
        renderTableData(data);
        currentPage = page;
      } catch (error) {
        document.getElementById('table-data-content').innerHTML = 
          '<div class="p-8 text-center text-red-500">데이터를 불러오는데 실패했습니다.</div>';
      }
    }

    function renderTableData(data) {
      const container = document.getElementById('table-data-content');
      const totalCount = document.getElementById('total-count');
      
      totalCount.textContent = '총 ' + data.totalCount.toLocaleString() + '개 행';
      
      if (data.rows.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-gray-500">데이터가 없습니다.</div>';
        document.getElementById('pagination').classList.add('hidden');
        return;
      }

      const totalPages = Math.ceil(data.totalCount / currentLimit);
      
      container.innerHTML = \`
        <table class="w-full text-sm">
          <thead class="bg-gray-50 sticky top-0">
            <tr>
              \${data.columns.map(col => \`<th class="px-4 py-2 text-left text-xs font-medium text-gray-700 whitespace-nowrap">\${col}</th>\`).join('')}
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-700 whitespace-nowrap">작업</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            \${data.rows.map((row, idx) => {
              const rowId = row.id || row[data.columns[0]];
              return \`
              <tr class="hover:bg-gray-50">
                \${data.columns.map(col => \`
                  <td class="px-4 py-2 text-gray-900 whitespace-nowrap">
                    \${row[col] !== null && row[col] !== undefined
                      ? (typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col]))
                      : '<span class="text-gray-400">NULL</span>'}
                  </td>
                \`).join('')}
                <td class="px-4 py-2 whitespace-nowrap">
                  <button
                    onclick="openEditModal(\${rowId})"
                    class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 mr-1"
                  >
                    수정
                  </button>
                  <button
                    onclick="deleteRow(\${rowId})"
                    class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            \`;
            }).join('')}
          </tbody>
        </table>
      \`;

      if (totalPages > 1) {
        const pagination = document.getElementById('pagination');
        pagination.classList.remove('hidden');
        pagination.innerHTML = \`
          <button
            onclick="loadTableData('\${currentTable}', \${currentPage - 1})"
            \${currentPage === 1 ? 'disabled' : ''}
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </button>
          <span class="text-sm text-gray-600">페이지 \${currentPage} / \${totalPages}</span>
          <button
            onclick="loadTableData('\${currentTable}', \${currentPage + 1})"
            \${currentPage === totalPages ? 'disabled' : ''}
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음
          </button>
        \`;
      } else {
        document.getElementById('pagination').classList.add('hidden');
      }
    }

    function handleSearch() {
      searchColumn = document.getElementById('search-column').value;
      searchValue = document.getElementById('search-value').value.trim();
      
      if (searchColumn || searchValue) {
        document.getElementById('reset-btn').classList.remove('hidden');
      }
      
      if (currentTable) {
        loadTableData(currentTable, 1);
      }
    }

    function resetSearch() {
      searchColumn = '';
      searchValue = '';
      document.getElementById('search-column').value = '';
      document.getElementById('search-value').value = '';
      document.getElementById('reset-btn').classList.add('hidden');
      
      if (currentTable) {
        loadTableData(currentTable, 1);
      }
    }

    async function openEditModal(rowId) {
      try {
        const row = await apiRequest('/tables/' + currentTable + '/rows/' + rowId);
        currentEditRow = row;
        currentEditId = rowId;
        
        const form = document.getElementById('edit-form');
        const editableColumns = tableSchema.filter(col => 
          !col.isSensitive && 
          col.columnName !== 'id' && 
          col.columnName !== 'created_at' && 
          col.columnName !== 'updated_at'
        );
        
        form.innerHTML = editableColumns.map(col => {
          const value = row[col.columnName];
          const displayValue = value !== null && value !== undefined ? String(value) : '';
          
          return \`
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">\${col.columnName}</label>
              <input
                type="text"
                id="edit-\${col.columnName}"
                value="\${displayValue}"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="\${col.isNullable === 'YES' ? 'NULL 허용' : '필수'}"
              />
              <p class="text-xs text-gray-500 mt-1">타입: \${col.dataType}</p>
            </div>
          \`;
        }).join('');
        
        document.getElementById('edit-modal').classList.remove('hidden');
      } catch (error) {
        alert('데이터를 불러오는데 실패했습니다: ' + error.message);
      }
    }

    function closeEditModal() {
      document.getElementById('edit-modal').classList.add('hidden');
      currentEditRow = null;
      currentEditId = null;
    }

    async function saveEdit() {
      if (!currentEditId || !currentTable) return;
      
      try {
        const editableColumns = tableSchema.filter(col => 
          !col.isSensitive && 
          col.columnName !== 'id' && 
          col.columnName !== 'created_at' && 
          col.columnName !== 'updated_at'
        );
        
        const updates = {};
        for (const col of editableColumns) {
          const input = document.getElementById('edit-' + col.columnName);
          const value = input.value.trim();
          
          if (value === '' && col.isNullable === 'YES') {
            updates[col.columnName] = null;
          } else if (value !== '') {
            // 타입 변환
            if (col.dataType.includes('int') || col.dataType.includes('numeric')) {
              updates[col.columnName] = value === '' ? null : Number(value);
            } else if (col.dataType.includes('bool')) {
              updates[col.columnName] = value === 'true' || value === '1';
            } else {
              updates[col.columnName] = value;
            }
          }
        }
        
        await apiRequest('/tables/' + currentTable + '/rows/' + currentEditId, {
          method: 'PATCH',
          body: JSON.stringify(updates)
        });
        
        alert('수정되었습니다.');
        closeEditModal();
        await loadTableData(currentTable, currentPage);
      } catch (error) {
        alert('수정에 실패했습니다: ' + error.message);
      }
    }

    async function deleteRow(rowId) {
      if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return;
      }
      
      try {
        await apiRequest('/tables/' + currentTable + '/rows/' + rowId, {
          method: 'DELETE'
        });
        
        alert('삭제되었습니다.');
        await loadTableData(currentTable, currentPage);
      } catch (error) {
        alert('삭제에 실패했습니다: ' + error.message);
      }
    }

    // 팀 상태 관리 관련 변수
    let ongoingTeam = null;
    let currentSlide = 1;

    // 팀 목록 로드
    async function loadTeamsStatus() {
      try {
        const teams = await apiRequest('/teams');
        const tbody = document.getElementById('teams-status-table');
        
        if (teams.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">팀이 없습니다.</td></tr>';
          return;
        }

        tbody.innerHTML = teams.map(team => {
          const statusClass = team.status === 'ongoing' 
            ? 'bg-red-500/20 text-red-700 border-red-500/30'
            : team.status === 'ended'
            ? 'bg-gray-500/20 text-gray-700 border-gray-500/30'
            : 'bg-blue-500/20 text-blue-700 border-blue-500/30';
          
          const statusText = team.status === 'ongoing' ? '발표 중' 
            : team.status === 'ended' ? '종료' 
            : '예정';

          return \`
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-gray-900">\${team.id}</td>
              <td class="px-4 py-3 font-medium text-gray-900">\${team.teamName}</td>
              <td class="px-4 py-3">
                <span class="px-3 py-1 rounded-full text-xs font-semibold border \${statusClass}">
                  \${statusText}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button
                    onclick="updateTeamStatus(\${team.id}, 'upcoming')"
                    \${team.status === 'upcoming' ? 'disabled' : ''}
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all \${team.status === 'upcoming' ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}"
                  >
                    예정
                  </button>
                  <button
                    onclick="updateTeamStatus(\${team.id}, 'ongoing')"
                    \${team.status === 'ongoing' ? 'disabled' : ''}
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all \${team.status === 'ongoing' ? 'bg-red-500/30 text-red-300 border border-red-500/50 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}"
                  >
                    발표 중
                  </button>
                  <button
                    onclick="updateTeamStatus(\${team.id}, 'ended')"
                    \${team.status === 'ended' ? 'disabled' : ''}
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all \${team.status === 'ended' ? 'bg-gray-500/30 text-gray-300 border border-gray-500/50 cursor-not-allowed' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}"
                  >
                    종료
                  </button>
                </div>
              </td>
            </tr>
          \`;
        }).join('');

        // 발표 중인 팀 확인
        const ongoing = teams.find(t => t.status === 'ongoing');
        if (ongoing) {
          ongoingTeam = ongoing;
          await loadCurrentSlide(ongoing.id);
          document.getElementById('ongoing-team-section').classList.remove('hidden');
          document.getElementById('ongoing-team-name').textContent = ongoing.teamName;
        } else {
          ongoingTeam = null;
          document.getElementById('ongoing-team-section').classList.add('hidden');
        }
      } catch (error) {
        console.error('Failed to load teams:', error);
        document.getElementById('teams-status-table').innerHTML = 
          '<tr><td colspan="4" class="px-4 py-8 text-center text-red-500">팀 목록을 불러오는데 실패했습니다.</td></tr>';
      }
    }

    async function loadCurrentSlide(teamId) {
      try {
        const data = await apiRequest('/teams/' + teamId + '/current-slide');
        currentSlide = data.currentSlide || 1;
        document.getElementById('current-slide-display').textContent = currentSlide;
        document.getElementById('slide-input').value = currentSlide;
      } catch (error) {
        console.error('Failed to load current slide:', error);
        currentSlide = 1;
      }
    }

    async function updateTeamStatus(teamId, newStatus) {
      if (!confirm('팀 상태를 변경하시겠습니까?')) {
        return;
      }

      try {
        await apiRequest('/teams/' + teamId + '/status', {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus })
        });
        
        // BroadcastChannel을 통해 변경 알림
        try {
          const channel = new BroadcastChannel('db-internal-updates');
          channel.postMessage({ type: 'status-changed', teamId, status: newStatus });
          channel.close();
        } catch (e) {
          // BroadcastChannel이 지원되지 않는 경우 무시
        }
        
        alert('상태가 변경되었습니다.');
        await loadTeamsStatus();
      } catch (error) {
        alert('상태 변경에 실패했습니다: ' + error.message);
      }
    }

    async function changeSlide(delta) {
      if (!ongoingTeam) return;
      
      const newSlide = Math.max(1, currentSlide + delta);
      await updateSlide(newSlide);
    }

    async function changeSlideToInput() {
      if (!ongoingTeam) return;
      
      const input = document.getElementById('slide-input');
      const newSlide = parseInt(input.value, 10);
      
      if (isNaN(newSlide) || newSlide < 1) {
        alert('올바른 슬라이드 번호를 입력하세요.');
        return;
      }
      
      await updateSlide(newSlide);
    }

    async function updateSlide(newSlide) {
      if (!ongoingTeam) return;
      
      try {
        await apiRequest('/teams/' + ongoingTeam.id + '/current-slide', {
          method: 'POST',
          body: JSON.stringify({ currentSlide: newSlide })
        });
        
        // BroadcastChannel을 통해 변경 알림
        try {
          const channel = new BroadcastChannel('db-internal-updates');
          channel.postMessage({ type: 'slide-changed', teamId: ongoingTeam.id, currentSlide: newSlide });
          channel.close();
        } catch (e) {
          // BroadcastChannel이 지원되지 않는 경우 무시
        }
        
        currentSlide = newSlide;
        document.getElementById('current-slide-display').textContent = currentSlide;
        document.getElementById('slide-input').value = currentSlide;
      } catch (error) {
        alert('슬라이드 변경에 실패했습니다: ' + error.message);
      }
    }

    // 투자금 현황 로드
    async function loadInvestmentOverview() {
      try {
        const overview = await apiRequest('/investment/overview');
        
        // 전체 투자금 요약
        document.getElementById('total-investment').textContent = 
          overview.totalInvestment.toLocaleString() + '원';
        document.getElementById('investment-limit').textContent = 
          overview.investmentLimit.toLocaleString() + '원';
        document.getElementById('remaining-capacity').textContent = 
          overview.remainingCapacity.toLocaleString() + '원';
        document.getElementById('active-investors').textContent = 
          overview.activeInvestors + '명';
        document.getElementById('total-users').textContent = 
          overview.totalUsers;

        // 남은 용량 색상 변경
        const remainingEl = document.getElementById('remaining-capacity');
        if (overview.remainingCapacity < 500000) {
          remainingEl.classList.remove('text-yellow-600');
          remainingEl.classList.add('text-red-600');
        } else {
          remainingEl.classList.remove('text-red-600');
          remainingEl.classList.add('text-yellow-600');
        }

        // 팀별 투자금 분포
        const container = document.getElementById('team-investments');
        if (overview.teamInvestments.length === 0) {
          container.innerHTML = '<div class="p-4 text-center text-gray-500">투자 데이터가 없습니다.</div>';
          return;
        }

        container.innerHTML = overview.teamInvestments.map(team => {
          const percentage = team.percentage.toFixed(1);
          return \`
            <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-3">
                  <span class="font-semibold text-gray-900">\${team.teamName}</span>
                  <span class="text-xs text-gray-500">(ID: \${team.teamId})</span>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold text-blue-600">\${team.investment.toLocaleString()}원</p>
                  <p class="text-xs text-gray-500">\${percentage}%</p>
                </div>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-3">
                <div 
                  class="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style="width: \${percentage}%"
                ></div>
              </div>
            </div>
          \`;
        }).join('');
      } catch (error) {
        console.error('Failed to load investment overview:', error);
        document.getElementById('team-investments').innerHTML = 
          '<div class="p-4 text-center text-red-500">투자금 현황을 불러오는데 실패했습니다.</div>';
      }
    }

    // 세부 지표 컬럼 토글
    let showDetailColumns = false;
    function toggleDetailColumns() {
      showDetailColumns = !showDetailColumns;
      const columns = document.querySelectorAll('.detail-column');
      const btn = document.getElementById('toggle-detail-btn');
      
      if (showDetailColumns) {
        columns.forEach(col => col.classList.remove('hidden'));
        btn.textContent = '세부 지표 숨기기';
        btn.classList.remove('bg-gray-500');
        btn.classList.add('bg-green-500');
      } else {
        columns.forEach(col => col.classList.add('hidden'));
        btn.textContent = '세부 지표 보기';
        btn.classList.remove('bg-green-500');
        btn.classList.add('bg-gray-500');
      }
    }

    // 개인 투자자 순위 로드
    async function loadInvestorRankings() {
      try {
        const limit = parseInt(document.getElementById('ranking-limit').value, 10) || 50;
        const rankings = await apiRequest('/investors/rankings?limit=' + limit);
        
        const tbody = document.getElementById('investor-rankings-table');
        
        if (rankings.length === 0) {
          const colspan = showDetailColumns ? 13 : 9;
          tbody.innerHTML = \`<tr><td colspan="\${colspan}" class="px-4 py-8 text-center text-gray-500">투자자 데이터가 없습니다.</td></tr>\`;
          return;
        }

        tbody.innerHTML = rankings.map(investor => {
          const roiClass = investor.roi >= 0 ? 'text-green-600' : 'text-red-600';
          const roiSign = investor.roi >= 0 ? '+' : '';
          
          // 최근 투자 시간 포맷팅
          let lastInvestmentDisplay = '-';
          if (investor.lastInvestmentTime) {
            const date = new Date(investor.lastInvestmentTime);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) {
              lastInvestmentDisplay = '방금 전';
            } else if (diffMins < 60) {
              lastInvestmentDisplay = diffMins + '분 전';
            } else if (diffHours < 24) {
              lastInvestmentDisplay = diffHours + '시간 전';
            } else if (diffDays < 7) {
              lastInvestmentDisplay = diffDays + '일 전';
            } else {
              lastInvestmentDisplay = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            }
          }
          
          const detailColumns = showDetailColumns ? \`
            <td class="px-4 py-3 text-right text-gray-600">\${investor.totalShares.toFixed(2)}주</td>
            <td class="px-4 py-3 text-right text-gray-600">\${investor.weightedAveragePrice > 0 ? investor.weightedAveragePrice.toLocaleString() + '원' : '-'}</td>
            <td class="px-4 py-3 text-right text-gray-600">\${investor.teamCount}팀</td>
            <td class="px-4 py-3 text-left text-gray-600">\${lastInvestmentDisplay}</td>
          \` : '';
          
          return \`
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-full \${investor.rank <= 3 ? 'bg-yellow-100 text-yellow-800 font-bold' : 'bg-gray-100 text-gray-700'}">
                  \${investor.rank}
                </span>
              </td>
              <td class="px-4 py-3 font-medium text-gray-900">\${investor.userName}</td>
              <td class="px-4 py-3 text-gray-600">\${investor.schoolNumber}</td>
              <td class="px-4 py-3 text-gray-600">\${investor.department}</td>
              <td class="px-4 py-3 text-right text-gray-900">\${investor.capital.toLocaleString()}원</td>
              <td class="px-4 py-3 text-right text-gray-900">\${investor.stockValue.toLocaleString()}원</td>
              <td class="px-4 py-3 text-right font-semibold text-blue-600">\${investor.totalAssets.toLocaleString()}원</td>
              <td class="px-4 py-3 text-right text-gray-600">\${investor.totalInvested.toLocaleString()}원</td>
              <td class="px-4 py-3 text-right font-semibold \${roiClass}">
                \${roiSign}\${investor.roi.toFixed(2)}%
              </td>
              \${detailColumns}
            </tr>
          \`;
        }).join('');
      } catch (error) {
        console.error('Failed to load investor rankings:', error);
        const colspan = showDetailColumns ? 13 : 9;
        document.getElementById('investor-rankings-table').innerHTML = 
          \`<tr><td colspan="\${colspan}" class="px-4 py-8 text-center text-red-500">투자자 순위를 불러오는데 실패했습니다.</td></tr>\`;
      }
    }

    // 실시간 모니터링 로드
    let pendingTradingAction = null;
    
    async function loadRealtimeMonitoring() {
      try {
        const data = await apiRequest('/monitoring/realtime');
        
        // TPS
        document.getElementById('current-tps').textContent = data.tps.toFixed(2);
        
        // 성공률
        document.getElementById('success-rate').textContent = data.successRate.toFixed(1) + '%';
        const successRateEl = document.getElementById('success-rate');
        if (data.successRate < 90) {
          successRateEl.classList.remove('text-green-600');
          successRateEl.classList.add('text-red-600');
        } else if (data.successRate < 95) {
          successRateEl.classList.remove('text-green-600', 'text-red-600');
          successRateEl.classList.add('text-yellow-600');
        } else {
          successRateEl.classList.remove('text-yellow-600', 'text-red-600');
          successRateEl.classList.add('text-green-600');
        }
        
        // 거래 수
        document.getElementById('buy-count').textContent = data.buyCount;
        document.getElementById('sell-count').textContent = data.sellCount;
        document.getElementById('error-count').textContent = data.errorCount;
        document.getElementById('db-connections').textContent = data.dbConnections;
        
        // 거래 상태 업데이트
        updateTradingStatusUI(data.tradingEnabled);
        
        // 모니터링 상태 업데이트
        const statusEl = document.getElementById('monitoring-status');
        if (data.errorCount > 10 || data.successRate < 90) {
          statusEl.textContent = '⚠️ 주의';
          statusEl.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700';
        } else if (data.errorCount > 5 || data.successRate < 95) {
          statusEl.textContent = '경고';
          statusEl.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700';
        } else {
          statusEl.textContent = '정상';
          statusEl.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700';
        }
        
        // 경고 메시지
        const warnings = [];
        if (data.tps > 15) warnings.push('TPS가 높습니다. 서버 부하를 모니터링하세요.');
        if (data.successRate < 95) warnings.push('성공률이 낮습니다. 에러 로그를 확인하세요.');
        if (data.dbConnections > 25) warnings.push('DB 연결 수가 높습니다. 커넥션 풀을 확인하세요.');
        if (!data.tradingEnabled) warnings.push('현재 거래가 중단되어 있습니다!');
        
        const warningSection = document.getElementById('warning-messages');
        const warningList = document.getElementById('warning-list');
        if (warnings.length > 0) {
          warningList.innerHTML = warnings.map(w => '<li>' + w + '</li>').join('');
          warningSection.classList.remove('hidden');
        } else {
          warningSection.classList.add('hidden');
        }
        
      } catch (error) {
        console.error('Failed to load realtime monitoring:', error);
      }
    }
    
    function updateTradingStatusUI(enabled) {
      const badge = document.getElementById('trading-status-badge');
      const btn = document.getElementById('trading-toggle-btn');
      
      if (enabled) {
        badge.textContent = '거래 활성화';
        badge.className = 'px-4 py-2 rounded-lg text-sm font-bold bg-green-500 text-white';
        btn.textContent = '🛑 투자 중단';
        btn.className = 'px-4 py-2 rounded-lg font-semibold transition-all bg-red-500 text-white hover:bg-red-600';
      } else {
        badge.textContent = '⚠️ 거래 중단됨';
        badge.className = 'px-4 py-2 rounded-lg text-sm font-bold bg-red-500 text-white animate-pulse';
        btn.textContent = '✅ 거래 재개';
        btn.className = 'px-4 py-2 rounded-lg font-semibold transition-all bg-green-500 text-white hover:bg-green-600';
      }
    }
    
    async function toggleTrading() {
      // 현재 상태 확인
      try {
        const status = await apiRequest('/trading/status');
        pendingTradingAction = !status.tradingEnabled;
        
        const modal = document.getElementById('trading-confirm-modal');
        const title = document.getElementById('trading-confirm-title');
        const message = document.getElementById('trading-confirm-message');
        const confirmBtn = document.getElementById('trading-confirm-btn');
        
        if (status.tradingEnabled) {
          title.textContent = '🛑 거래를 중단하시겠습니까?';
          title.className = 'text-xl font-bold mb-4 text-red-600';
          message.textContent = '모든 사용자의 매수/매도가 차단됩니다. 긴급 상황에서만 사용하세요.';
          confirmBtn.textContent = '거래 중단';
          confirmBtn.className = 'flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-semibold';
        } else {
          title.textContent = '✅ 거래를 재개하시겠습니까?';
          title.className = 'text-xl font-bold mb-4 text-green-600';
          message.textContent = '모든 사용자의 매수/매도가 다시 가능해집니다.';
          confirmBtn.textContent = '거래 재개';
          confirmBtn.className = 'flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-semibold';
        }
        
        modal.classList.remove('hidden');
      } catch (error) {
        alert('거래 상태 확인에 실패했습니다: ' + error.message);
      }
    }
    
    async function confirmToggleTrading() {
      if (pendingTradingAction === null) return;
      
      try {
        await apiRequest('/trading/toggle', {
          method: 'POST',
          body: JSON.stringify({ enabled: pendingTradingAction })
        });
        
        updateTradingStatusUI(pendingTradingAction);
        closeToggleModal();
        
        const message = pendingTradingAction 
          ? '✅ 거래가 재개되었습니다.' 
          : '🛑 거래가 중단되었습니다.';
        alert(message);
        
        await loadRealtimeMonitoring();
      } catch (error) {
        alert('거래 상태 변경에 실패했습니다: ' + error.message);
      }
    }
    
    function closeToggleModal() {
      document.getElementById('trading-confirm-modal').classList.add('hidden');
      pendingTradingAction = null;
    }

    // 대회 결과 발표 페이지 열기
    function openAwardPage(awardType) {
      const frontendUrl = '${process.env.FRONTEND_URL || "http://localhost:3000"}';
      const awardUrl = \`\${frontendUrl}/award/now?type=\${awardType}\`;
      window.open(awardUrl, '_blank');
    }

    // 초기화
    if (adminToken) {
      showMainScreen();
      loadData();
      loadPricingConfig();
      loadTeamsForPriceEditor();
      loadTeamsStatus();
      loadInvestmentOverview();
      loadInvestorRankings();
      loadRealtimeMonitoring();
      // 투자 시드 정보 주기적 업데이트 (10초마다)
      setInterval(async () => {
        try {
          const config = await apiRequest('/pricing/config');
          await updateInvestmentSeedInfo(config);
        } catch (error) {
          console.error('Failed to update investment seed info:', error);
        }
      }, 10000);
      // 투자금 현황 주기적 업데이트 (10초마다)
      setInterval(async () => {
        try {
          await loadInvestmentOverview();
        } catch (error) {
          console.error('Failed to reload investment overview:', error);
        }
      }, 10000);
      // 투자자 순위 주기적 업데이트 (30초마다)
      setInterval(async () => {
        try {
          await loadInvestorRankings();
        } catch (error) {
          console.error('Failed to reload investor rankings:', error);
        }
      }, 30000);
      // 팀 상태 주기적 업데이트 (5초마다)
      setInterval(async () => {
        try {
          await loadTeamsStatus();
        } catch (error) {
          console.error('Failed to reload teams status:', error);
        }
      }, 5000);
      // 실시간 모니터링 주기적 업데이트 (3초마다)
      setInterval(async () => {
        try {
          await loadRealtimeMonitoring();
        } catch (error) {
          console.error('Failed to reload realtime monitoring:', error);
        }
      }, 3000);
    } else {
      showLoginScreen();
    }
  </script>
</body>
</html>`;
  }
}
