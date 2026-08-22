-- AlterTable: add assignedUserId with a temporary default so existing rows are valid
ALTER TABLE "WorkOrder" ADD COLUMN "assignedUserId" INTEGER;

-- Backfill existing rows with the first user (admin)
UPDATE "WorkOrder" SET "assignedUserId" = (SELECT "id" FROM "User" ORDER BY "id" ASC LIMIT 1);

-- Now enforce NOT NULL
ALTER TABLE "WorkOrder" ALTER COLUMN "assignedUserId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
