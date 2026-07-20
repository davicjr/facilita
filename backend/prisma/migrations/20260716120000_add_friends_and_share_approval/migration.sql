-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'FRIEND_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'FRIEND_ACCEPTED';

-- AlterTable: Share ganha status de aprovacao.
-- Compartilhamentos ja existentes sao mantidos como ACCEPTED (nao podem sumir
-- da tela de quem ja recebeu); novos entram como PENDING (default final).
ALTER TABLE "Share" ADD COLUMN "status" "ShareStatus" NOT NULL DEFAULT 'ACCEPTED';
ALTER TABLE "Share" ADD COLUMN "approvedAt" TIMESTAMP(3);
UPDATE "Share" SET "approvedAt" = "createdAt" WHERE "status" = 'ACCEPTED';
ALTER TABLE "Share" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Share_status_idx" ON "Share"("status");

-- CreateTable
CREATE TABLE "Friendship" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requesterId" UUID NOT NULL,
    "addresseeId" UUID NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");

-- CreateIndex
CREATE INDEX "Friendship_requesterId_idx" ON "Friendship"("requesterId");

-- CreateIndex
CREATE INDEX "Friendship_addresseeId_idx" ON "Friendship"("addresseeId");

-- CreateIndex
CREATE INDEX "Friendship_status_idx" ON "Friendship"("status");

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
