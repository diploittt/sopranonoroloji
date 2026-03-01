SELECT u."tenantId", t.slug, u.email, u."displayName", u.role FROM "User" u LEFT JOIN "Tenant" t ON u."tenantId" = t.id WHERE u.role = 'godmaster';
