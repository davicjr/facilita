import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { PermissionFlags } from '../permissions/permissions.constants';
import { SearchGlobalDto } from './dto/search-global.dto';
import { SearchService } from './search.service';

type SearchActor = {
  id: string;
  role: UserRole;
  permissions?: PermissionFlags;
};

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  searchGlobal(@Request() req: { user: SearchActor }, @Query() query: SearchGlobalDto) {
    return this.searchService.searchGlobal(req.user, query);
  }
}
