/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Repository` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Repository_name_key" ON "Repository"("name");
