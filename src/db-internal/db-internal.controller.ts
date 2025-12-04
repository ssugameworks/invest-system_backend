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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { Response, Request } from "express";
import { DbInternalService } from "./db-internal.service";
import { AdminGuard } from "../guards/admin.guard";
import { PricingService } from "../pricing/pricing.service";

@ApiTags("DB Internal")
@Controller("db-internal")
export class DbInternalController {
  constructor(
    private readonly dbInternalService: DbInternalService,
    private readonly pricingService: PricingService
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
    C1: { type: 'number' },
    C2: { type: 'number' },
    GAMMA: { type: 'number' },
    L1: { type: 'number' },
    U1: { type: 'number' },
    L2: { type: 'number' },
    U2: { type: 'number' }
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
    
    // CORS 헤더 명시적 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
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
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">P0 (초기 가격)</label>
                <input type="number" id="config-P0" step="1" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">L1 (라운드1 하한)</label>
                <input type="number" id="config-L1" step="0.01" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">U1 (라운드1 상한)</label>
                <input type="number" id="config-U1" step="0.01" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">L2 (라운드2 하한)</label>
                <input type="number" id="config-L2" step="0.01" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">U2 (라운드2 상한)</label>
                <input type="number" id="config-U2" step="0.01" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">GAMMA (압축 계수)</label>
                <input type="number" id="config-GAMMA" step="0.01" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">C1 (자본1)</label>
                <input type="number" id="config-C1" step="1" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">C2 (자본2)</label>
                <input type="number" id="config-C2" step="1" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
              </div>
              <div class="p-3 bg-gray-50 rounded">
                <label class="block text-gray-600 mb-1">T (시간 단위)</label>
                <input type="number" id="config-T" step="1" class="w-full px-2 py-1 border border-gray-300 rounded-md" />
              </div>
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

    const API_BASE = window.location.origin + '/db-internal/api';

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
        handleLogout();
        throw new Error('인증이 만료되었습니다.');
      }

      if (!response.ok) {
        throw new Error('요청 실패: ' + response.status);
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
        document.getElementById('config-N').value = config.N || '';
        document.getElementById('config-P0').value = config.P0 || '';
        document.getElementById('config-L1').value = config.L1 || '';
        document.getElementById('config-U1').value = config.U1 || '';
        document.getElementById('config-L2').value = config.L2 || '';
        document.getElementById('config-U2').value = config.U2 || '';
        document.getElementById('config-GAMMA').value = config.GAMMA || '';
        document.getElementById('config-C1').value = config.C1 || '';
        document.getElementById('config-C2').value = config.C2 || '';
        document.getElementById('config-T').value = config.T || '';
      } catch (error) {
        console.error('Failed to load pricing config:', error);
      }
    }

    async function savePricingConfig() {
      try {
        const updates = {};
        const keys = ['N', 'T', 'P0', 'C1', 'C2', 'GAMMA', 'L1', 'U1', 'L2', 'U2'];
        
        for (const key of keys) {
          const input = document.getElementById('config-' + key);
          const value = input.value.trim();
          if (value !== '') {
            updates[key] = parseFloat(value);
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

    // 초기화
    if (adminToken) {
      showMainScreen();
      loadData();
      loadPricingConfig();
      loadTeamsForPriceEditor();
    } else {
      showLoginScreen();
    }
  </script>
</body>
</html>`;
  }
}
