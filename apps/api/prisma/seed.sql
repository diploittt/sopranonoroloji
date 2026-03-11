-- Seed data for sopranochat-dev

-- 1. Tenant
INSERT INTO "Tenant" (id, name, "displayName", slug, domain, status, "packageType", "apiKey", "apiSecret", "createdAt", "updatedAt")
VALUES (
  'system-tenant-001',
  'SopranoChat',
  'SopranoChat',
  'system',
  'localhost',
  'ACTIVE',
  'CAMERA',
  'system-api-key-001',
  'soprano-api-secret-hash',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Owner User (IRMAK)
INSERT INTO "User" (id, "tenantId", "displayName", email, "passwordHash", role, "isOnline", "createdAt", "updatedAt")
VALUES (
  'owner-user-001',
  'system-tenant-001',
  'IRMAK',
  'irmak@sopranochat.com',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  'owner',
  false,
  NOW(),
  NOW()
)
ON CONFLICT ("tenantId", email) DO NOTHING;

-- 3. Rooms
INSERT INTO "Room" (id, "tenantId", name, slug, status, "ownerId", "createdAt", "updatedAt")
VALUES
  ('room-genel-001', 'system-tenant-001', 'Genel Sohbet', 'genel-sohbet', 'ACTIVE', 'owner-user-001', NOW(), NOW()),
  ('room-gurbet-001', 'system-tenant-001', 'Gurbetçiler', 'gurbetciler', 'ACTIVE', 'owner-user-001', NOW(), NOW()),
  ('room-muzik-001', 'system-tenant-001', 'Müzik Odası', 'muzik-odasi', 'ACTIVE', 'owner-user-001', NOW(), NOW())
ON CONFLICT ("tenantId", slug) DO NOTHING;

-- 4. System Settings
INSERT INTO "SystemSettings" (id, "tenantId", "welcomeMessage", "micDuration", "defaultLanguage", "micDurationGuest", "micDurationMember", "micDurationVip", "micDurationAdmin", "guestProfile", "guestPrivateMessage", "guestCamera", "updatedAt")
VALUES (
  'settings-001',
  'system-tenant-001',
  'SopranoChat''a hoş geldiniz!',
  120,
  'tr',
  120,
  180,
  300,
  0,
  true,
  false,
  true,
  NOW()
)
ON CONFLICT ("tenantId") DO NOTHING;
