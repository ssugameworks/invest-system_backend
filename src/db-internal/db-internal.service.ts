import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

export interface TableInfo {
  tableName: string;
  rowCount: number;
}

export interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: string;
  columnDefault: string | null;
  isSensitive?: boolean;
}

export interface TableData {
  columns: string[];
  rows: any[];
  totalCount: number;
}

// 민감한 컬럼 목록 (이 컬럼들은 데이터에서 제외)
const SENSITIVE_COLUMNS = [
  "password",
  "accessToken",
  "access_token",
  "token",
  "secret",
  "api_key",
  "apiKey",
  "private_key",
  "privateKey",
];

@Injectable()
export class DbInternalService {
  private lastNetworkStats: { rx: number; tx: number; timestamp: number } | null = null;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  private escapeIdentifier(identifier: string): string {
    // PostgreSQL identifier escape: double quotes
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private isValidIdentifier(identifier: string): boolean {
    // PostgreSQL identifier validation: alphanumeric, underscore, and must not start with number
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
  }

  async getTables(): Promise<TableInfo[]> {
    const query = `
      SELECT 
        table_name as "tableName",
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as "columnCount"
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const tables = await this.dataSource.query(query);

    // 각 테이블의 행 수 조회
    const tableInfos: TableInfo[] = await Promise.all(
      tables.map(async (table: any) => {
        try {
          if (!this.isValidIdentifier(table.tableName)) {
            return {
              tableName: table.tableName,
              rowCount: 0,
            };
          }
          const escapedTableName = this.escapeIdentifier(table.tableName);
          const countResult = await this.dataSource.query(
            `SELECT COUNT(*) as count FROM ${escapedTableName}`
          );
          return {
            tableName: table.tableName,
            rowCount: parseInt(countResult[0].count, 10),
          };
        } catch (error) {
          return {
            tableName: table.tableName,
            rowCount: 0,
          };
        }
      })
    );

    return tableInfos;
  }

  async getTableSchema(tableName: string): Promise<ColumnInfo[]> {
    // Validate table name
    if (!this.isValidIdentifier(tableName)) {
      throw new Error('Invalid table name');
    }

    const query = `
      SELECT 
        column_name as "columnName",
        data_type as "dataType",
        is_nullable as "isNullable",
        column_default as "columnDefault"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position;
    `;

    const columns = await this.dataSource.query(query, [tableName]);
    
    // 민감한 컬럼 표시 (데이터는 숨김)
    return columns.map((col: ColumnInfo) => ({
      ...col,
      isSensitive: SENSITIVE_COLUMNS.some(
        (sensitive) => col.columnName.toLowerCase().includes(sensitive.toLowerCase())
      ),
    }));
  }

  async getTableData(
    tableName: string,
    page: number = 1,
    limit: number = 50,
    searchColumn?: string,
    searchValue?: string
  ): Promise<TableData> {
    // Validate table name
    if (!this.isValidIdentifier(tableName)) {
      throw new Error('Invalid table name');
    }

    const escapedTableName = this.escapeIdentifier(tableName);

    // 전체 개수 조회
    let countQuery = `SELECT COUNT(*) as count FROM ${escapedTableName}`;
    const countParams: any[] = [];

    if (searchColumn && searchValue) {
      if (!this.isValidIdentifier(searchColumn)) {
        throw new Error('Invalid column name');
      }
      const escapedColumn = this.escapeIdentifier(searchColumn);
      countQuery += ` WHERE ${escapedColumn}::text ILIKE $1`;
      countParams.push(`%${searchValue}%`);
    }

    const countResult = await this.dataSource.query(countQuery, countParams);
    const totalCount = parseInt(countResult[0].count, 10);

    // 데이터 조회
    let dataQuery = `SELECT * FROM ${escapedTableName}`;
    const dataParams: any[] = [];

    if (searchColumn && searchValue) {
      if (!this.isValidIdentifier(searchColumn)) {
        throw new Error('Invalid column name');
      }
      const escapedColumn = this.escapeIdentifier(searchColumn);
      dataQuery += ` WHERE ${escapedColumn}::text ILIKE $1`;
      dataParams.push(`%${searchValue}%`);
    }

    const offset = (page - 1) * limit;
    const paramIndex = dataParams.length + 1;
    dataQuery += ` ORDER BY (SELECT NULL) LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    dataParams.push(limit, offset);

    const rows = await this.dataSource.query(dataQuery, dataParams);

    // 컬럼명 추출
    const allColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
    
    // 민감한 컬럼 필터링
    const safeColumns = allColumns.filter(
      (col) => !SENSITIVE_COLUMNS.some((sensitive) => 
        col.toLowerCase().includes(sensitive.toLowerCase())
      )
    );

    // 민감한 데이터 제거
    const safeRows = rows.map((row: any) => {
      const safeRow: any = {};
      safeColumns.forEach((col) => {
        safeRow[col] = row[col];
      });
      return safeRow;
    });

    return {
      columns: safeColumns,
      rows: safeRows,
      totalCount,
    };
  }

  async getDatabaseStats(): Promise<{
    totalTables: number;
    totalRows: number;
    databaseSize: string;
  }> {
    const tables = await this.getTables();
    const totalRows = tables.reduce((sum, table) => sum + table.rowCount, 0);

    const sizeQuery = `
      SELECT pg_size_pretty(pg_database_size(current_database())) as size;
    `;
    const sizeResult = await this.dataSource.query(sizeQuery);

    return {
      totalTables: tables.length,
      totalRows,
      databaseSize: sizeResult[0].size,
    };
  }

  async updateRow(
    tableName: string,
    id: number,
    updates: Record<string, any>
  ): Promise<void> {
    if (!this.isValidIdentifier(tableName)) {
      throw new Error('Invalid table name');
    }

    // 민감한 컬럼 수정 방지
    const sensitiveKeys = Object.keys(updates).filter(key =>
      SENSITIVE_COLUMNS.some(sensitive =>
        key.toLowerCase().includes(sensitive.toLowerCase())
      )
    );
    if (sensitiveKeys.length > 0) {
      throw new Error(`Cannot update sensitive columns: ${sensitiveKeys.join(', ')}`);
    }

    const escapedTableName = this.escapeIdentifier(tableName);
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (!this.isValidIdentifier(key)) {
        throw new Error(`Invalid column name: ${key}`);
      }
      const escapedKey = this.escapeIdentifier(key);
      setClauses.push(`${escapedKey} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      throw new Error('No updates provided');
    }

    params.push(id);
    const query = `
      UPDATE ${escapedTableName}
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
    `;

    await this.dataSource.query(query, params);
  }

  async deleteRow(tableName: string, id: number): Promise<void> {
    if (!this.isValidIdentifier(tableName)) {
      throw new Error('Invalid table name');
    }

    const escapedTableName = this.escapeIdentifier(tableName);
    const query = `DELETE FROM ${escapedTableName} WHERE id = $1`;
    await this.dataSource.query(query, [id]);
  }

  async getRowById(tableName: string, id: number): Promise<any> {
    if (!this.isValidIdentifier(tableName)) {
      throw new Error('Invalid table name');
    }

    const escapedTableName = this.escapeIdentifier(tableName);
    const query = `SELECT * FROM ${escapedTableName} WHERE id = $1 LIMIT 1`;
    const result = await this.dataSource.query(query, [id]);
    
    if (result.length === 0) {
      throw new Error('Row not found');
    }

    return result[0];
  }

  async updateTeamPrice(teamId: number, updates: { p?: number; p0?: number; p1?: number; p2?: number; money?: number }): Promise<void> {
    const escapedTableName = this.escapeIdentifier("competition_teams");
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.p !== undefined) {
      setClauses.push(`p = $${paramIndex}`);
      params.push(updates.p);
      paramIndex++;
    }
    if (updates.p0 !== undefined) {
      setClauses.push(`p0 = $${paramIndex}`);
      params.push(updates.p0);
      paramIndex++;
    }
    if (updates.p1 !== undefined) {
      setClauses.push(`p1 = $${paramIndex}`);
      params.push(updates.p1);
      paramIndex++;
    }
    if (updates.p2 !== undefined) {
      setClauses.push(`p2 = $${paramIndex}`);
      params.push(updates.p2);
      paramIndex++;
    }
    if (updates.money !== undefined) {
      setClauses.push(`money = $${paramIndex}`);
      params.push(updates.money);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      throw new Error('No updates provided');
    }

    params.push(teamId);
    const query = `
      UPDATE ${escapedTableName}
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
    `;

    await this.dataSource.query(query, params);
  }

  async getPricingConfig(): Promise<any> {
    // DB에서 가격 설정 읽기, 없으면 환경변수에서 읽기
    try {
      const query = `SELECT key, value FROM pricing_config`;
      const rows = await this.dataSource.query(query);
      
      if (rows.length > 0) {
        const config: any = {};
        rows.forEach((row: any) => {
          config[row.key] = Number(row.value);
        });
        
        // E1, E2 계산
        const N = config.N || Number(process.env.PRICING_N ?? 50);
        const C1 = config.C1 || Number(process.env.PRICING_C1 ?? 5000);
        const C2 = config.C2 || Number(process.env.PRICING_C2 ?? 3000);
        const T = config.T || Number(process.env.PRICING_T ?? 6);
        config.E1 = (N * C1) / T;
        config.E2 = (N * C2) / T;
        
        return config;
      }
    } catch (error) {
      // 테이블이 없으면 환경변수에서 읽기
    }

    // 환경변수에서 읽기 (fallback)
    return {
      N: Number(process.env.PRICING_N ?? 50),
      T: Number(process.env.PRICING_T ?? 6),
      P0: Number(process.env.PRICING_P0 ?? 1000),
      C1: Number(process.env.PRICING_C1 ?? 5000),
      C2: Number(process.env.PRICING_C2 ?? 3000),
      GAMMA: Number(process.env.PRICING_GAMMA ?? 0.5),
      L1: Number(process.env.PRICING_L1 ?? 0.7),
      U1: Number(process.env.PRICING_U1 ?? 1.5),
      L2: Number(process.env.PRICING_L2 ?? 0.8),
      U2: Number(process.env.PRICING_U2 ?? 1.4),
    };
  }

  async updatePricingConfig(updates: Record<string, number>): Promise<void> {
    const escapedTableName = this.escapeIdentifier("pricing_config");
    
    for (const [key, value] of Object.entries(updates)) {
      if (!this.isValidIdentifier(key)) {
        throw new Error(`Invalid config key: ${key}`);
      }
      
      const escapedKey = this.escapeIdentifier("key");
      const query = `
        INSERT INTO ${escapedTableName} (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) 
        DO UPDATE SET value = $2, updated_at = NOW()
      `;
      
      await this.dataSource.query(query, [key, value]);
    }
  }

  async getServerMetrics(): Promise<any> {
    try {
      const os = require('os');
      const fs = require('fs').promises;
      
      // CPU 사용률 (간단한 계산)
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      cpus.forEach((cpu: any) => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - ~~(100 * idle / total);
      
      // 메모리 - Node.js 프로세스의 실제 메모리 사용량 사용
      const processMemory = process.memoryUsage();
      const heapUsed = processMemory.heapUsed;
      const heapTotal = processMemory.heapTotal;
      const rss = processMemory.rss; // Resident Set Size - 실제 물리 메모리 사용량
      
      // Railway Pro 메모리 제한 (32GB = 32 * 1024 * 1024 * 1024 bytes)
      // 환경변수로 오버라이드 가능
      const memoryLimitBytes = process.env.MEMORY_LIMIT_GB 
        ? Number(process.env.MEMORY_LIMIT_GB) * 1024 * 1024 * 1024
        : 32 * 1024 * 1024 * 1024; // 기본값 32GB
      
      // 시스템 메모리 정보 (참고용)
      const systemTotalMem = os.totalmem();
      const systemFreeMem = os.freemem();
      const systemUsedMem = systemTotalMem - systemFreeMem;
      
      // Railway Pro 메모리 제한 대비 사용률 계산 (정확한 계산)
      const memoryLimitPercent = Math.min(100, Math.max(0, (rss / memoryLimitBytes) * 100));
      const systemMemPercent = systemTotalMem > 0 ? (systemUsedMem / systemTotalMem) * 100 : 0;
      
      // 네트워크 트래픽 통계
      const networkInterfaces = os.networkInterfaces();
      let totalRx = 0;
      let totalTx = 0;
      
      // 모든 네트워크 인터페이스의 통계 수집
      for (const name in networkInterfaces) {
        const interfaces = networkInterfaces[name];
        if (interfaces) {
          for (const iface of interfaces) {
            // 내부 인터페이스는 제외 (lo, docker0 등)
            if (!iface.internal && iface.family === 'IPv4') {
              // Node.js os 모듈은 실시간 통계를 제공하지 않으므로
              // /proc/net/dev를 읽거나 이전 값과 비교해야 함
              // 여기서는 간단히 이전 값과 비교하는 방식 사용
            }
          }
        }
      }
      
      // 네트워크 통계는 /proc/net/dev를 읽어야 정확함
      // 하지만 Docker/Railway 환경에서는 제한적일 수 있음
      // 대신 이전 호출과의 차이를 계산
      const now = Date.now();
      let rxSpeed = 0;
      let txSpeed = 0;
      let totalRxBytes = 0;
      let totalTxBytes = 0;
      
      try {
        const fs = require('fs');
        // Linux에서 네트워크 통계 읽기
        if (process.platform === 'linux') {
          try {
            const netDev = fs.readFileSync('/proc/net/dev', 'utf8');
            const lines = netDev.split('\n');
            for (const line of lines) {
              const match = line.match(/^\s*(\w+):\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/);
              if (match) {
                const iface = match[1];
                const rx = parseInt(match[2], 10);
                const tx = parseInt(match[3], 10);
                
                // lo (loopback) 제외
                if (iface !== 'lo') {
                  totalRxBytes += rx;
                  totalTxBytes += tx;
                }
              }
            }
            
            // 이전 통계와 비교하여 속도 계산
            if (this.lastNetworkStats) {
              const timeDiff = (now - this.lastNetworkStats.timestamp) / 1000; // 초
              if (timeDiff > 0) {
                rxSpeed = (totalRxBytes - this.lastNetworkStats.rx) / timeDiff;
                txSpeed = (totalTxBytes - this.lastNetworkStats.tx) / timeDiff;
              }
            }
            
            // 현재 통계 저장
            this.lastNetworkStats = {
              rx: totalRxBytes,
              tx: totalTxBytes,
              timestamp: now
            };
          } catch (error) {
            // /proc/net/dev를 읽을 수 없는 경우 (권한 문제 등)
          }
        }
      } catch (error) {
        // 네트워크 통계를 가져올 수 없는 경우
      }
      
      // 디스크 사용량 (Node.js에서는 직접 지원하지 않으므로 기본값 사용)
      // 실제 디스크 사용량을 얻으려면 외부 패키지(예: node-disk-info)가 필요하지만
      // 에러를 방지하기 위해 기본값으로 처리
      let diskUsed = 0;
      let diskTotal = 0;
      let diskPercent = 0;
      
      // 디스크 정보는 선택적으로 제공 (필요시 외부 패키지 사용)
      // 현재는 0으로 설정하여 에러를 방지
      
      return {
        cpu: {
          usage: Math.max(0, Math.min(100, usage)),
          cores: cpus.length
        },
        memory: {
          // Node.js 프로세스 메모리 (실제 사용 중인 메모리)
          processUsed: rss,
          processHeapUsed: heapUsed,
          processHeapTotal: heapTotal,
          // Railway 메모리 제한
          limit: memoryLimitBytes,
          // 시스템 메모리 (참고용)
          systemTotal: systemTotalMem,
          systemUsed: systemUsedMem,
          systemFree: systemFreeMem,
          // 사용률 (Railway 메모리 제한 대비)
          percent: memoryLimitPercent,
          systemPercent: systemMemPercent
        },
        disk: {
          total: diskTotal,
          used: diskUsed,
          free: diskTotal - diskUsed,
          percent: diskPercent
        },
        network: {
          rxBytes: totalRxBytes,
          txBytes: totalTxBytes,
          rxSpeed: Math.max(0, rxSpeed), // 초당 수신 바이트
          txSpeed: Math.max(0, txSpeed)  // 초당 전송 바이트
        },
        uptime: os.uptime(),
        processCount: 0, // 프로세스 수는 별도로 계산 필요
        nodeVersion: process.version,
        platform: os.platform()
      };
    } catch (error) {
      // 에러 발생 시 기본값 반환
      return {
        cpu: { usage: 0, cores: 0 },
        memory: { total: 0, used: 0, free: 0, percent: 0 },
        disk: { total: 0, used: 0, free: 0, percent: 0 },
        uptime: 0,
        processCount: 0,
        nodeVersion: process.version || '-',
        platform: require('os').platform() || '-'
      };
    }
  }
}

