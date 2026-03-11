/*
  Warnings:

  - The primary key for the `SystemConfig` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "SystemConfig" DROP CONSTRAINT "SystemConfig_pkey",
ADD COLUMN     "accountId" TEXT NOT NULL DEFAULT 'global',
ADD CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key", "accountId");
