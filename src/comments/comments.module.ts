import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommentsController } from "./comments.controller";
import { CommentsService } from "./comments.service";
import { CommentEntity } from "./entity/comment.entity";
import { CompetitionTeam } from "../teams/entity/team.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CommentEntity, CompetitionTeam])],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}


