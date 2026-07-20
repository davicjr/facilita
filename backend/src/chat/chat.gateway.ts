import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { EditMessageDto } from './dto/edit-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatService } from './chat.service';
import { UsersService } from '../users/users.service';

type SocketUserData = {
  userId?: string;
  name?: string;
};

const roomChannel = (roomId: string) => `chat:${roomId}`;

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const secret =
        this.configService.get<string>('JWT_ACCESS_SECRET') || 'dev-access';
      const payload = this.jwtService.verify<{ sub: string }>(token, { secret });
      const user = await this.usersService.findActiveById(payload.sub);

      if (!user) {
        client.disconnect();
        return;
      }

      const data = client.data as SocketUserData;
      data.userId = user.id;
      data.name = user.name;

      client.join(`user:${user.id}`);

      const rooms = await this.chatService.getUserRooms(user.id);
      rooms.forEach((roomId) => client.join(roomChannel(roomId)));

      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }

      this.userSockets.get(user.id)?.add(client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const data = client.data as SocketUserData;
    if (!data.userId) {
      return;
    }

    const sockets = this.userSockets.get(data.userId);
    if (!sockets) {
      return;
    }

    sockets.delete(client.id);

    if (sockets.size === 0) {
      this.userSockets.delete(data.userId);
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId?: string },
  ) {
    const userId = (client.data as SocketUserData).userId;
    if (!userId || !payload?.roomId) {
      return;
    }

    await this.chatService.ensureRoomMembership(payload.roomId, userId);
    client.join(roomChannel(payload.roomId));
  }

  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ) {
    const userId = (client.data as SocketUserData).userId;
    if (!userId) {
      return;
    }

    const message = await this.chatService.sendMessage(
      payload.roomId,
      userId,
      payload.content,
    );

    this.server.to(roomChannel(payload.roomId)).emit('chat:message', message);
    return message;
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId?: string; isTyping?: boolean },
  ) {
    const data = client.data as SocketUserData;
    if (!data.userId || !payload?.roomId) {
      return;
    }

    await this.chatService.ensureRoomMembership(payload.roomId, data.userId);
    client.to(roomChannel(payload.roomId)).emit('chat:typing', {
      roomId: payload.roomId,
      userId: data.userId,
      name: data.name,
      isTyping: Boolean(payload.isTyping),
    });
  }

  @SubscribeMessage('chat:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId?: string },
  ) {
    const userId = (client.data as SocketUserData).userId;
    if (!userId || !payload?.roomId) {
      return;
    }

    const update = await this.chatService.markAsRead(payload.roomId, userId);
    this.server.to(roomChannel(payload.roomId)).emit('chat:read-update', update);
    return update;
  }

  @SubscribeMessage('chat:edit')
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: EditMessageDto & { messageId?: string },
  ) {
    const userId = (client.data as SocketUserData).userId;
    if (!userId || !payload?.messageId) {
      return;
    }

    const message = await this.chatService.editMessage(
      payload.messageId,
      userId,
      payload.content,
    );

    this.server.to(roomChannel(message.roomId)).emit('chat:message-edited', {
      messageId: message.id,
      roomId: message.roomId,
      content: message.content,
      editedAt: message.editedAt,
    });

    return message;
  }

  @SubscribeMessage('chat:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId?: string },
  ) {
    const userId = (client.data as SocketUserData).userId;
    if (!userId || !payload?.messageId) {
      return;
    }

    const result = await this.chatService.deleteMessage(payload.messageId, userId);

    this.server.to(roomChannel(result.roomId)).emit('chat:message-deleted', {
      messageId: result.messageId,
      roomId: result.roomId,
      deletedAt: result.deletedAt,
    });

    return result;
  }

  async emitRoomCreated(userIds: string[], room: unknown & { id: string }) {
    this.attachUsersToRoom(userIds, room.id);
    userIds.forEach((userId) => {
      this.server.to(`user:${userId}`).emit('chat:room-created', room);
    });
  }

  async emitRoomUpdated(userIds: string[], room: unknown & { id: string }) {
    this.attachUsersToRoom(userIds, room.id);
    this.server.to(roomChannel(room.id)).emit('chat:room-updated', room);
    userIds.forEach((userId) => {
      this.server.to(`user:${userId}`).emit('chat:room-created', room);
    });
  }

  emitRoomRemoved(userId: string, roomId: string) {
    this.detachUserFromRoom(userId, roomId);
    this.server.to(`user:${userId}`).emit('chat:room-removed', { roomId });
  }

  private attachUsersToRoom(userIds: string[], roomId: string) {
    const channel = roomChannel(roomId);

    userIds.forEach((userId) => {
      const sockets = this.userSockets.get(userId);
      if (!sockets) {
        return;
      }

      sockets.forEach((socketId) => {
        this.server.sockets.sockets.get(socketId)?.join(channel);
      });
    });
  }

  private detachUserFromRoom(userId: string, roomId: string) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) {
      return;
    }

    const channel = roomChannel(roomId);
    sockets.forEach((socketId) => {
      this.server.sockets.sockets.get(socketId)?.leave(channel);
    });
  }
}
