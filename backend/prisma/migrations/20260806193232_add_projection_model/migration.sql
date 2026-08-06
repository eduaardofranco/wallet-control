-- CreateTable
CREATE TABLE "Projection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "year" INTEGER NOT NULL,
    "payoutPct" REAL,
    "dividendPerShare" REAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    CONSTRAINT "Projection_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Projection_assetId_year_key" ON "Projection"("assetId", "year");
