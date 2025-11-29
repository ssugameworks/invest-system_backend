import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { User } from "./entity/user.entity";
import { UserInvestment } from "../investments/entity/user-investment.entity";
import { CompetitionTeam } from "../teams/entity/team.entity";

@Injectable()
export class UserDeletionService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserInvestment)
    private readonly investmentRepo: Repository<UserInvestment>,
    @InjectRepository(CompetitionTeam)
    private readonly teamRepo: Repository<CompetitionTeam>,
    private readonly dataSource: DataSource
  ) {}

  /**
   * 사용자 삭제 시 투자금 환불 처리
   * 1. 사용자의 모든 투자 내역 조회
   * 2. 각 팀의 투자금에서 해당 금액 차감
   * 3. 투자 기록 삭제 (CASCADE)
   * 4. 사용자 삭제
   */
  async deleteUser(userId: number): Promise<{ message: string; refundedAmount: number }> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. 사용자 존재 확인
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) {
        throw new NotFoundException("사용자를 찾을 수 없습니다.");
      }

      // 2. 사용자의 모든 투자 내역 조회
      const investments = await manager.find(UserInvestment, {
        where: { user_id: userId },
      });

      let totalRefund = 0;

      // 3. 각 팀의 투자금에서 차감
      for (const investment of investments) {
        const team = await manager.findOne(CompetitionTeam, {
          where: { id: investment.team_id },
        });

        if (team) {
          // 투자 금액만큼 팀의 총 투자금에서 차감
          const currentMoney = team.money ?? 0;
          team.money = Math.max(0, currentMoney - investment.invested_amount);
          await manager.save(CompetitionTeam, team);

          totalRefund += investment.invested_amount;
        }
      }

      // 4. 투자 기록 삭제 (CASCADE로 자동 삭제되지만 명시적으로 처리)
      await manager.delete(UserInvestment, { user_id: userId });

      // 5. 사용자 삭제
      await manager.delete(User, { id: userId });

      return {
        message: `사용자 ${user.name}(${user.schoolNumber})이 삭제되었습니다.`,
        refundedAmount: totalRefund,
      };
    });
  }

  /**
   * 여러 사용자 일괄 삭제
   */
  async deleteUsers(userIds: number[]): Promise<{
    deletedCount: number;
    totalRefund: number;
    details: Array<{ userId: number; refunded: number }>;
  }> {
    const details: Array<{ userId: number; refunded: number }> = [];
    let totalRefund = 0;
    let deletedCount = 0;

    for (const userId of userIds) {
      try {
        const result = await this.deleteUser(userId);
        details.push({ userId, refunded: result.refundedAmount });
        totalRefund += result.refundedAmount;
        deletedCount++;
      } catch (error) {
        console.error(`사용자 ${userId} 삭제 실패:`, error);
      }
    }

    return {
      deletedCount,
      totalRefund,
      details,
    };
  }
}

