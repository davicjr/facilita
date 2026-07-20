import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow all origins - same as main.ts CORS config
      callback(null, true);
    },
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socket IDs

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake query or auth header
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT
      const secret =
        this.configService.get<string>('JWT_ACCESS_SECRET') || 'dev-access';
      const payload = this.jwtService.verify(token, { secret });

      // Validate user
      const user = await this.usersService.findActiveById(payload.sub);
      if (!user) {
        client.disconnect();
        return;
      }

      // Store authenticated userId in socket
      client.data.userId = user.id;

      // Add socket to user's room
      client.join(`user:${user.id}`);

      // Track socket for this user
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      console.log(`WebSocket connected: user=${user.id}, socket=${client.id}`);
    } catch (error) {
      console.error('WebSocket auth error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      console.log(`WebSocket disconnected: user=${userId}, socket=${client.id}`);
    }
  }

  // Emit notification to specific user
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Emit notification to multiple users
  emitToUsers(userIds: string[], event: string, data: any) {
    userIds.forEach((userId) => {
      this.emitToUser(userId, event, data);
    });
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}
