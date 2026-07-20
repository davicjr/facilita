import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Request,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user.id;
    const parsedLimit = limit ? parseInt(limit) : 50;
    const parsedOffset = offset ? parseInt(offset) : 0;

    return this.notificationsService.findByUser(userId, parsedLimit, parsedOffset);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.id;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    await this.notificationsService.markAsRead(id, userId);
    return { success: true };
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.id;
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Delete(':id')
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    await this.notificationsService.delete(id, userId);
    return { success: true };
  }
}
