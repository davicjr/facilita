import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  avatarUrl: true,
  theme: true,
  createdAt: true,
  updatedAt: true,
};

type UserProfile = Prisma.UserGetPayload<{ select: typeof userSelect }>;
type AuthUserProfile = UserProfile & {
  permissions: Awaited<ReturnType<PermissionsService['getResolvedRolePermissions']>>;
};
type SharedUserUpdateData = {
  name?: string;
  username?: string;
  avatarUrl?: string | null;
  theme?: Record<string, unknown>;
  password?: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { email: username } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findActiveById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, status: UserStatus.ACTIVE },
      select: userSelect,
    });
  }

  async findActiveAuthById(id: string): Promise<AuthUserProfile | null> {
    const user = await this.findActiveById(id);

    if (!user) {
      return null;
    }

    return this.attachPermissions(user);
  }

  async findAll(options?: {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    skip?: number;
    take?: number;
  }) {
    const search = options?.search?.trim();

    const where: Prisma.UserWhereInput = {
      ...(options?.role ? { role: options.role } : {}),
      ...(options?.status ? { status: options.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: userSelect,
        ...(options?.skip !== undefined ? { skip: options.skip } : {}),
        ...(options?.take !== undefined ? { take: options.take } : {}),
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findAuthProfile(id: string): Promise<AuthUserProfile> {
    const user = await this.findOne(id);
    return this.attachPermissions(user);
  }

  async create(data: CreateUserDto) {
    const existingEmail = await this.findByEmail(data.username);
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const theme = data.theme
      ? (data.theme as Prisma.InputJsonValue)
      : undefined;

    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.username,
        passwordHash,
        role: data.role ?? UserRole.USER,
        status: data.status ?? UserStatus.ACTIVE,
        avatarUrl: data.avatarUrl,
        theme,
      },
      select: userSelect,
    });
  }

  private async buildUserUpdateData(
    current: { email: string },
    data: SharedUserUpdateData,
  ): Promise<Prisma.UserUpdateInput> {
    if (data.username && data.username !== current.email) {
      const existingEmail = await this.findByEmail(data.username);
      if (existingEmail) {
        throw new ConflictException('Email already in use');
      }
    }

    const updateData: Prisma.UserUpdateInput = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.username !== undefined ? { email: data.username } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      ...(data.theme !== undefined
        ? { theme: data.theme as Prisma.InputJsonValue }
        : {}),
    };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    return updateData;
  }

  async update(id: string, data: UpdateUserDto) {
    const current = await this.findOne(id);
    const updateData = await this.buildUserUpdateData(current, data);

    if (data.role !== undefined) {
      updateData.role = data.role;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });
  }

  async updateProfile(id: string, data: UpdateProfileDto) {
    const current = await this.findOne(id);
    const updateData = await this.buildUserUpdateData(current, data);

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });
  }

  async updateOwnProfile(id: string, data: UpdateProfileDto): Promise<AuthUserProfile> {
    const updated = await this.updateProfile(id, data);
    return this.attachPermissions(updated);
  }

  async getDependencies(id: string) {
    const [
      links,
      schedules,
      notes,
      uploadedImages,
      sharesSent,
      sharesReceived,
      favorites,
      refreshTokens,
      activityLogs,
      auditLogs,
      notifications,
    ] = await Promise.all([
      this.prisma.link.count({ where: { ownerId: id } }),
      this.prisma.uploadedSchedule.count({ where: { ownerId: id } }),
      this.prisma.note.count({ where: { ownerId: id } }),
      this.prisma.uploadedImage.count({ where: { uploadedBy: id } }),
      this.prisma.share.count({ where: { ownerId: id, revokedAt: null } }),
      this.prisma.share.count({ where: { recipientId: id, revokedAt: null } }),
      this.prisma.favorite.count({ where: { userId: id } }),
      this.prisma.refreshToken.count({ where: { userId: id } }),
      this.prisma.activityLog.count({ where: { userId: id } }),
      this.prisma.auditLog.count({ where: { userId: id } }),
      this.prisma.notification.count({ where: { userId: id } }),
    ]);

    return {
      links,
      schedules,
      notes,
      uploadedImages,
      sharesSent,
      sharesReceived,
      favorites,
      refreshTokens,
      activityLogs,
      auditLogs,
      notifications,
      hasAny:
        links > 0 ||
        schedules > 0 ||
        notes > 0 ||
        uploadedImages > 0 ||
        sharesSent > 0 ||
        sharesReceived > 0 ||
        favorites > 0 ||
        refreshTokens > 0 ||
        activityLogs > 0 ||
        auditLogs > 0 ||
        notifications > 0,
    };
  }

  async remove(id: string, actorId?: string) {
    const target = await this.findById(id);

    if (!target) {
      throw new NotFoundException('User not found');
    }

    if (actorId && actorId === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    return this.prisma.user.delete({
      where: { id },
      select: userSelect,
    });
  }

  private async attachPermissions(user: UserProfile): Promise<AuthUserProfile> {
    const permissions = await this.permissionsService.getResolvedRolePermissions(user.role);
    return {
      ...user,
      permissions,
    };
  }
}
