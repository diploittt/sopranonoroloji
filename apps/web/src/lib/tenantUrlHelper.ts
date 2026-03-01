/**
 * Helper to build tenant-specific URLs using the system base URL.
 * Karmaşık accessCode kullanarak tahmin edilmesi zor linkler üretir.
 */

interface BuildTenantUrlsProps {
    tenantSlug: string;
    accessCode: string;             // Backend'den dönen karmaşık token
    customerDomain: string;
    webBaseUrl?: string;
}

export function buildTenantUrls({ tenantSlug, accessCode, customerDomain, webBaseUrl }: BuildTenantUrlsProps) {
    // Priority: Argument > NEXT_PUBLIC_WEB_BASE_URL > NEXT_PUBLIC_SERVICE_BASE_URL > fallback
    const base = webBaseUrl
        || process.env.NEXT_PUBLIC_WEB_BASE_URL
        || process.env.NEXT_PUBLIC_SERVICE_BASE_URL
        || 'http://localhost:3000';

    // Ensure no trailing slash for clean concatenation
    const cleanBase = base.replace(/\/$/, "");

    return {
        loginLink: `${cleanBase}/t/${accessCode}`,
        embedCode: `<iframe src="${cleanBase}/embed/${tenantSlug}" width="100%" height="1000" frameborder="0" allow="camera; microphone; fullscreen; display-capture" style="border:none;border-radius:12px;max-width:1300px;"></iframe>`,
        customerDomainAlias: customerDomain,
        adminUsername: `admin@${customerDomain}`,
        apiEndpoint: `https://api.sopranochat.com/v1/tenant/${tenantSlug}`
    };
}
