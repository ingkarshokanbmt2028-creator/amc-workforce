-- CreateTable
CREATE TABLE "CreditBalance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "initialCredit" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeCredits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalCredit" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "totalHoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetHours" DOUBLE PRECISION NOT NULL DEFAULT 250,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditBalance_employeeId_month_year_key" ON "CreditBalance"("employeeId", "month", "year");

-- AddForeignKey
ALTER TABLE "CreditBalance" ADD CONSTRAINT "CreditBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
