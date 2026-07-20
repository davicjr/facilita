-- AlterTable
ALTER TABLE "RolePermission" ADD COLUMN     "canManageImages" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageNotes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewCategories" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewFavorites" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewHome" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewImages" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewNotes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewSchedules" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewSharesPage" BOOLEAN NOT NULL DEFAULT true;
