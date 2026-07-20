import { Injectable } from '@nestjs/common';
import { EntityStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DashboardPeriod = 'ALL' | '30' | '7';
type DashboardContent = 'ALL' | 'LINK' | 'SCHEDULE' | 'NOTE';

type SummaryCategory = {
  name: string;
  count: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(filters: { period?: string; content?: string }) {
    const period = this.normalizePeriod(filters.period);
    const content = this.normalizeContent(filters.content);
    const createdAt = this.buildCreatedAtFilter(period);

    const contentWhere = createdAt
      ? { deletedAt: null, createdAt }
      : { deletedAt: null };

    const [
      users,
      usersActive,
      links,
      linkActive,
      linkCategories,
      schedules,
      scheduleActive,
      scheduleCategories,
      notes,
      noteActive,
      noteCategories,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.link.count({ where: contentWhere }),
      this.prisma.link.count({
        where: { ...contentWhere, status: EntityStatus.ACTIVE },
      }),
      this.prisma.link.findMany({
        where: contentWhere,
        select: {
          category: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.uploadedSchedule.count({ where: contentWhere }),
      this.prisma.uploadedSchedule.count({
        where: { ...contentWhere, status: EntityStatus.ACTIVE },
      }),
      this.prisma.uploadedSchedule.findMany({
        where: contentWhere,
        select: {
          category: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.note.count({ where: contentWhere }),
      this.prisma.note.count({
        where: { ...contentWhere, status: EntityStatus.ACTIVE },
      }),
      this.prisma.note.findMany({
        where: contentWhere,
        select: {
          category: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const selectedCategories =
      content === 'LINK'
        ? linkCategories
        : content === 'SCHEDULE'
          ? scheduleCategories
          : content === 'NOTE'
            ? noteCategories
            : [...linkCategories, ...scheduleCategories, ...noteCategories];

    const topCategories = this.buildTopCategories(selectedCategories);

    const totalItems =
      content === 'LINK'
        ? links
        : content === 'SCHEDULE'
          ? schedules
          : content === 'NOTE'
            ? notes
            : links + schedules + notes;

    return {
      period,
      content,
      users,
      usersActive,
      links,
      linkActive,
      schedules,
      scheduleActive,
      notes,
      noteActive,
      totalItems,
      totalCategories: topCategories.totalCategories,
      topCategories: topCategories.items,
    };
  }

  private normalizePeriod(value?: string): DashboardPeriod {
    if (value === '30' || value === '7') {
      return value;
    }

    return 'ALL';
  }

  private normalizeContent(value?: string): DashboardContent {
    if (value === 'LINK' || value === 'SCHEDULE' || value === 'NOTE') {
      return value;
    }

    return 'ALL';
  }

  private buildCreatedAtFilter(period: DashboardPeriod) {
    if (period === 'ALL') {
      return undefined;
    }

    const days = Number(period);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return { gte: since };
  }

  private buildTopCategories(
    rows: Array<{ category: { name: string } | null }>,
  ): { totalCategories: number; items: SummaryCategory[] } {
    const counts = new Map<string, number>();

    rows.forEach((row) => {
      const name = row.category?.name?.trim();
      if (!name) {
        return;
      }

      counts.set(name, (counts.get(name) ?? 0) + 1);
    });

    const items = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
      .slice(0, 4);

    return {
      totalCategories: counts.size,
      items,
    };
  }
}
