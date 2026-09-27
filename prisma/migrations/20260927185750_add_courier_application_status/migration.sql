-- CreateEnum
CREATE TYPE "CourierApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "courier_profiles" ADD COLUMN     "applicationStatus" "CourierApplicationStatus" NOT NULL DEFAULT 'PENDING';
