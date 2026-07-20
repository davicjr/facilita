import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { FriendsModule } from './friends/friends.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { LinksModule } from './links/links.module';
import { UploadedSchedulesModule } from './uploaded-schedules/uploaded-schedules.module';
import { NotesModule } from './notes/notes.module';
import { UploadsModule } from './uploads/uploads.module';
import { BackupsModule } from './backups/backups.module';
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { ResetsModule } from './resets/resets.module';
import { FavoritesModule } from './favorites/favorites.module';
import { SystemConfigModule } from './system-config/system-config.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';
import { SharesModule } from './shares/shares.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    UsersModule,
    AuthModule,
    PermissionsModule,
    HealthModule,
    CategoriesModule,
    LinksModule,
    UploadedSchedulesModule,
    NotesModule,
    UploadsModule,
    BackupsModule,
    BootstrapModule,
    ResetsModule,
    FavoritesModule,
    SystemConfigModule,
    NotificationsModule,
    SearchModule,
    SharesModule,
    DashboardModule,
    ChatModule,
    FriendsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
