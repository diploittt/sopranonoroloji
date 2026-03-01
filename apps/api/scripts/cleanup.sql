-- 1. Delete Ban Logs
DELETE FROM "BanLog";

-- 2. Delete IP Bans
DELETE FROM "IpBan";

-- 3. Delete Audit Logs related to moderation
DELETE FROM "AuditLog" 
WHERE event IN ('user.ban', 'user.gag', 'user.unban', 'ip.ban', 'user.kick');

-- 4. Reset User Ban Status
UPDATE "User"
SET "isBanned" = false, "banExpiresAt" = NULL
WHERE "isBanned" = true OR "banExpiresAt" IS NOT NULL;
