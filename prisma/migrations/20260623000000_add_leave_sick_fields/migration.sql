-- AlterTable: add confirmationStatus to Employee
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "confirmationStatus" TEXT NOT NULL DEFAULT 'CONFIRMED';

-- AlterTable: add sick leave + holiday carry-forward fields to LeaveBalance
ALTER TABLE "LeaveBalance" ADD COLUMN IF NOT EXISTS "holidayCarryForward" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LeaveBalance" ADD COLUMN IF NOT EXISTS "sickEntitlement" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "LeaveBalance" ADD COLUMN IF NOT EXISTS "sickTaken" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LeaveBalance" ADD COLUMN IF NOT EXISTS "sickRemaining" INTEGER NOT NULL DEFAULT 12;
