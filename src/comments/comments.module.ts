import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommentsController } from "./comments.controller";
import { CommentsService } from "./comments.service";
import { CommentEntity } from "./entity/comment.entity";
import { CompetitionTeam } from "../teams/entity/team.entity";
import { RecentCommentsController } from "./recent-comments.controller";
import { User } from "../users/entity/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity, CompetitionTeam, User])],
  controllers: [CommentsController, RecentCommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}


