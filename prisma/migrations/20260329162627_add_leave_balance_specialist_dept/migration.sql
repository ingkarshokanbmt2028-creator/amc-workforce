-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "annualEntitlement" INTEGER NOT NULL DEFAULT 0,
    "openingBalance" INTEGER NOT NULL DEFAULT 0,
    "totalAvailable" INTEGER NOT NULL DEFAULT 0,
    "daysTaken" INTEGER NOT NULL DEFAULT 0,
    "daysRemaining" INTEGER NOT NULL DEFAULT 0,
    "leaveNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_employeeId_fiscalYear_key" ON "LeaveBalance"("employeeId", "fiscalYear");

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
