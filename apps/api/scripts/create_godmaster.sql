INSERT INTO "User" (id, "tenantId", email, "displayName", role, "passwordHash", "isOnline", "isBanned", "createdAt", "updatedAt")
VALUES (
    'godmaster-admin-001',
    'cmlmqhn8e0000zcbj0nremtpc',
    'admin@soprano.com',
    'GodMaster',
    'godmaster',
    '$2b$10$ZoISN38c0lZxi4b/ib0pYObnItcvbZ3MZ1BDNB7GDk3Kzllt.4aOS',
    false,
    false,
    NOW(),
    NOW()
)
ON CONFLICT ("tenantId", email) DO UPDATE SET
    role = 'godmaster',
    "passwordHash" = '$2b$10$ZoISN38c0lZxi4b/ib0pYObnItcvbZ3MZ1BDNB7GDk3Kzllt.4aOS',
    "displayName" = 'GodMaster';
