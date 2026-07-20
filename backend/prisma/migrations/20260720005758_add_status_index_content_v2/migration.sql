-- CreateIndex
CREATE INDEX "Link_status_idx" ON "Link"("status");

-- CreateIndex
CREATE INDEX "Link_deletedAt_status_idx" ON "Link"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "Note_status_idx" ON "Note"("status");

-- CreateIndex
CREATE INDEX "Note_deletedAt_status_idx" ON "Note"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "UploadedSchedule_status_idx" ON "UploadedSchedule"("status");

-- CreateIndex
CREATE INDEX "UploadedSchedule_deletedAt_status_idx" ON "UploadedSchedule"("deletedAt", "status");
