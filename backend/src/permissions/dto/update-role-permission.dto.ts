import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateRolePermissionDto {
  @IsOptional()
  @IsBoolean()
  canViewHome?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewDashboard?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewFavorites?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewSharesPage?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewUsers?: boolean;

  @IsOptional()
  @IsBoolean()
  canCreateUsers?: boolean;

  @IsOptional()
  @IsBoolean()
  canEditUsers?: boolean;

  @IsOptional()
  @IsBoolean()
  canDeleteUsers?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewCategories?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageCategories?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewLinks?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageLinks?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewSchedules?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageSchedules?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewNotes?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageNotes?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewImages?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageImages?: boolean;

  @IsOptional()
  @IsBoolean()
  canBackupSystem?: boolean;

  @IsOptional()
  @IsBoolean()
  canResetSystem?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageSystemConfig?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageShares?: boolean;
}
