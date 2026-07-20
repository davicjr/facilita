import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  listFriends(@CurrentUser() user: { id: string }) {
    return this.friendsService.listFriends(user.id);
  }

  @Get('discover')
  discover(
    @CurrentUser() user: { id: string },
    @Query('search') search?: string,
  ) {
    return this.friendsService.discover(user.id, search);
  }

  @Get('requests/received')
  listReceived(@CurrentUser() user: { id: string }) {
    return this.friendsService.listReceivedRequests(user.id);
  }

  @Get('requests/sent')
  listSent(@CurrentUser() user: { id: string }) {
    return this.friendsService.listSentRequests(user.id);
  }

  @Post('requests')
  sendRequest(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(user.id, dto.addresseeId);
  }

  @Patch('requests/:id/accept')
  accept(
    @CurrentUser() user: { id: string },
    @Param('id', new ParseUUIDPipe()) friendshipId: string,
  ) {
    return this.friendsService.accept(user.id, friendshipId);
  }

  @Delete('requests/:id')
  removeRequest(
    @CurrentUser() user: { id: string },
    @Param('id', new ParseUUIDPipe()) friendshipId: string,
  ) {
    return this.friendsService.removeRequest(user.id, friendshipId);
  }

  @Delete(':userId')
  removeFriend(
    @CurrentUser() user: { id: string },
    @Param('userId', new ParseUUIDPipe()) otherUserId: string,
  ) {
    return this.friendsService.removeFriend(user.id, otherUserId);
  }
}
