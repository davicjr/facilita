/*
  Warnings:

  - You are about to drop the column `publicToken` on the `Link` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `Link` table. All the data in the column will be lost.
  - You are about to drop the column `publicToken` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `canViewPrivateContent` on the `RolePermission` table. All the data in the column will be lost.
  - You are about to drop the column `publicToken` on the `UploadedSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `UploadedSchedule` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Link_publicToken_key";

-- DropIndex
DROP INDEX "Link_visibility_idx";

-- DropIndex
DROP INDEX "Note_publicToken_key";

-- DropIndex
DROP INDEX "Note_visibility_idx";

-- DropIndex
DROP INDEX "UploadedSchedule_publicToken_key";

-- DropIndex
DROP INDEX "UploadedSchedule_visibility_idx";

-- AlterTable
ALTER TABLE "Link" DROP COLUMN "publicToken",
DROP COLUMN "visibility";

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "publicToken",
DROP COLUMN "visibility";

-- AlterTable
ALTER TABLE "RolePermission" DROP COLUMN "canViewPrivateContent";

-- AlterTable
ALTER TABLE "UploadedSchedule" DROP COLUMN "publicToken",
DROP COLUMN "visibility";

-- DropEnum
DROP TYPE "ContentVisibility";
