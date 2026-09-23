-- DropIndex
DROP INDEX "audit_logs_userId_idx";

-- DropIndex
DROP INDEX "payment_attempts_shipmentId_idx";

-- DropIndex
DROP INDEX "shipment_events_createdAt_idx";

-- DropIndex
DROP INDEX "shipment_events_shipmentId_idx";

-- DropIndex
DROP INDEX "shipment_transfers_fromHubId_idx";

-- DropIndex
DROP INDEX "shipment_transfers_shipmentId_idx";

-- DropIndex
DROP INDEX "shipment_transfers_toHubId_idx";

-- DropIndex
DROP INDEX "shipments_courierId_idx";

-- DropIndex
DROP INDEX "shipments_customerId_idx";

-- DropIndex
DROP INDEX "shipments_status_idx";

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "payment_attempts_shipmentId_status_idx" ON "payment_attempts"("shipmentId", "status");

-- CreateIndex
CREATE INDEX "shipment_events_shipmentId_createdAt_idx" ON "shipment_events"("shipmentId", "createdAt");

-- CreateIndex
CREATE INDEX "shipment_transfers_shipmentId_createdAt_idx" ON "shipment_transfers"("shipmentId", "createdAt");

-- CreateIndex
CREATE INDEX "shipment_transfers_fromHubId_status_idx" ON "shipment_transfers"("fromHubId", "status");

-- CreateIndex
CREATE INDEX "shipment_transfers_toHubId_status_idx" ON "shipment_transfers"("toHubId", "status");

-- CreateIndex
CREATE INDEX "shipments_customerId_status_createdAt_idx" ON "shipments"("customerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "shipments_courierId_status_idx" ON "shipments"("courierId", "status");

-- CreateIndex
CREATE INDEX "shipments_originZoneId_destinationZoneId_idx" ON "shipments"("originZoneId", "destinationZoneId");

-- CreateIndex
CREATE INDEX "shipments_status_createdAt_idx" ON "shipments"("status", "createdAt");
