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
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { AddChatMemberDto } from './dto/add-chat-member.dto';
import { CreateDmDto } from './dto/create-dm.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('rooms')
  getRooms(@CurrentUser() user: { id: string }) {
    return this.chatService.getRoomsForUser(user.id);
  }

  @Get('users')
  getUsers(
    @CurrentUser() user: { id: string },
    @Query('search') search?: string,
  ) {
    return this.chatService.listAvailableUsers(user.id, search);
  }

  @Post('rooms/direct')
  async createDirectRoom(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDmDto,
  ) {
    const room = await this.chatService.getOrCreateDM(user.id, dto.recipientId);
    await this.chatGateway.emitRoomCreated(
      room.members.map((member) => member.userId),
      room,
    );
    return room;
  }

  @Post('rooms/group')
  async createGroup(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateGroupDto,
  ) {
    const room = await this.chatService.createGroup(user.id, dto.name, dto.memberIds);
    await this.chatGateway.emitRoomCreated(
      room.members.map((member) => member.userId),
      room,
    );
    return room;
  }

  @Post('rooms/:id/members')
  async addMember(
    @Param('id', new ParseUUIDPipe()) roomId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AddChatMemberDto,
  ) {
    const room = await this.chatService.addMember(roomId, user.id, dto.userId);
    await this.chatGateway.emitRoomUpdated(
      room.members.map((member) => member.userId),
      room,
    );
    return room;
  }

  @Delete('rooms/:id/members/:userId')
  async removeMember(
    @Param('id', new ParseUUIDPipe()) roomId: string,
    @Param('userId', new ParseUUIDPipe()) targetUserId: string,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.chatService.removeMember(roomId, user.id, targetUserId);

    if (result.room) {
      await this.chatGateway.emitRoomUpdated(result.remainingMemberIds, result.room);
    }

    this.chatGateway.emitRoomRemoved(result.removedUserId, result.roomId);
    return { success: true };
  }

  @Delete('rooms/:id')
  async deleteRoom(
    @Param('id', new ParseUUIDPipe()) roomId: string,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.chatService.deleteRoomForUser(roomId, user.id);
    this.chatGateway.emitRoomRemoved(result.removedUserId, result.roomId);
    return { success: true };
  }

  @Get('rooms/:id/messages')
  getMessages(
    @Param('id', new ParseUUIDPipe()) roomId: string,
    @CurrentUser() user: { id: string },
    @Query() query: GetMessagesDto,
  ) {
    return this.chatService.getMessages(roomId, user.id, query.cursor, query.limit);
  }

  @Post('messages')
  async sendMessage(
    @CurrentUser() user: { id: string },
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.chatService.sendMessage(dto.roomId, user.id, dto.content);
    this.chatGateway.server.to(`chat:${dto.roomId}`).emit('chat:message', message);
    return message;
  }

  @Patch('rooms/:id/read')
  async markAsRead(
    @Param('id', new ParseUUIDPipe()) roomId: string,
    @CurrentUser() user: { id: string },
  ) {
    const update = await this.chatService.markAsRead(roomId, user.id);
    this.chatGateway.server.to(`chat:${roomId}`).emit('chat:read-update', update);
    return update;
  }

  @Patch('messages/:id')
  async editMessage(
    @Param('id', new ParseUUIDPipe()) messageId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: EditMessageDto,
  ) {
    const message = await this.chatService.editMessage(messageId, user.id, dto.content);
    this.chatGateway.server.to(`chat:${message.roomId}`).emit('chat:message-edited', {
      messageId: message.id,
      roomId: message.roomId,
      content: message.content,
      editedAt: message.editedAt,
    });
    return message;
  }

  @Delete('messages/:id')
  async deleteMessage(
    @Param('id', new ParseUUIDPipe()) messageId: string,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.chatService.deleteMessage(messageId, user.id);
    this.chatGateway.server.to(`chat:${result.roomId}`).emit('chat:message-deleted', {
      messageId: result.messageId,
      roomId: result.roomId,
      deletedAt: result.deletedAt,
    });
    return result;
  }
}
