import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ResetDto } from './dto/reset.dto';
import { ResetsService } from './resets.service';

@Controller('resets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('canResetSystem')
export class ResetsController {
  constructor(private readonly resetsService: ResetsService) {}

  @Post()
  reset(@Body() data: ResetDto) {
    return this.resetsService.reset(data.entities);
  }
}
