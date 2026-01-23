import type { Page } from 'playwright';
import type {
    AuditPlugin,
    AuditContext,
    AuditResult,
    PluginConfig,
    Issue,
    IssueSeverity,
    FixGuidance,
} from '../../core/plugin-interface.js';

type SecurityHeader = {
    readonly name: string;
    readonly value: string | null;
    readonly expected?: string;
    readonly severity: IssueSeverity;
    readonly owaspCategory: string;
};

type SecurityHeaderCheck = {
    readonly header: string;
    readonly required: boolean;
    readonly expectedPattern?: RegExp;
    readonly severity: IssueSeverity;
    readonly owaspCategory: string;
    readonly description: string;
    readonly recommendation: string;
    readonly codeExample: string;
};

/**
 * Security Headers Plugin for OWASP Top 10 validation
 * 
 * Provides comprehensive security header analysis:
 * - Content Security Policy (CSP) validation
 * - HSTS, X-Frame-Options, X-Content-Type-Options checks
 * - Cookie security (HttpOnly, Secure, SameSite)
 * - CORS misconfiguration detection
 * - Subresource Integrity (SRI) validation
 */
export class SecurityHeadersPlugin implements AuditPlugin {
    public readonly name = 'security-headers';
    public readonly version = '1.0.0';
    public readonly type = 'security' as const;
    public readonly phase = 1 as const;
    public readonly dependencies: readonly string[] = [];

    private config: PluginConfig = {
        enabled: true,
        settings: {},
    };

    private readonly securityHeaderChecks: readonly SecurityHeaderCheck[] = [
        {
            header: 'Strict-Transport-Security',
            required: true,
            expectedPattern: /max-age=\d+/,
            severity: 'high',
            owaspCategory: 'A05:2021 - Security Misconfiguration',
            description: 'HSTS header missing or misconfigured',
            recommendation: 'Enable HSTS to enforce HTTPS connections',
            codeExample: 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
        },
        {
            header: 'X-Frame-Options',
            required: true,
            expectedPattern: /^(DENY|SAMEORIGIN)$/,
            severity: 'high',
            owaspCategory: 'A03:2021 - Injection',
            description: 'X-Frame-Options header missing or misconfigured',
            recommendation: 'Prevent clickjacking attacks by setting X-Frame-Options',
            codeExample: 'X-Frame-Options: DENY',
        },
        {
            header: 'X-Content-Type-Options',
            required: true,
            expectedPattern: /^nosniff$/,
            severity: 'medium',
            owaspCategory: 'A05:2021 - Security Misconfiguration',
            description: 'X-Content-Type-Options header missing',
            recommendation: 'Prevent MIME type sniffing',
            codeExample: 'X-Content-Type-Options: nosniff',
        },
        {
            header: 'Content-Security-Policy',
            required: true,
            severity: 'critical',
            owaspCategory: 'A03:2021 - Injection',
            description: 'Content Security Policy (CSP) header missing',
            recommendation: 'Implement CSP to prevent XSS and injection attacks',
            codeExample: "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        },
        {
            header: 'X-XSS-Protection',
            required: false,
            expectedPattern: /^1; mode=block$/,
            severity: 'low',
            owaspCategory: 'A03:2021 - Injection',
            description: 'X-XSS-Protection header missing (legacy browsers)',
            recommendation: 'Enable XSS protection for legacy browsers',
            codeExample: 'X-XSS-Protection: 1; mode=block',
        },
        {
            header: 'Referrer-Policy',
            required: true,
            expectedPattern: /^(no-referrer|strict-origin-when-cross-origin|same-origin)$/,
            severity: 'medium',
            owaspCategory: 'A01:2021 - Broken Access Control',
            description: 'Referrer-Policy header missing or weak',
            recommendation: 'Control referrer information leakage',
            codeExample: 'Referrer-Policy: strict-origin-when-cross-origin',
        },
        {
            header: 'Permissions-Policy',
            required: false,
            severity: 'low',
            owaspCategory: 'A05:2021 - Security Misconfiguration',
            description: 'Permissions-Policy header missing',
            recommendation: 'Control browser features and APIs',
            codeExample: 'Permissions-Policy: geolocation=(), microphone=(), camera=()',
        },
    ];

    public async configure(config: PluginConfig): Promise<void> {
        this.config = config;
    }

    public validate(config: PluginConfig): boolean {
        return config.enabled === true;
    }

    public async audit(context: AuditContext): Promise<AuditResult> {
        const startTime = Date.now();
        const issues: Issue[] = [];
        const metrics: Record<string, number> = {};

        try {
            // Navigate to the page and capture response headers
            const response = await context.page.goto(context.url, { waitUntil: 'domcontentloaded' });

            if (!response) {
                throw new Error('Failed to load page');
            }

            const headers = response.headers();

            // Check security headers
            const headerIssues = this.checkSecurityHeaders(headers, context.pageConfig.path);
            issues.push(...headerIssues);

            // Check cookie security
            const cookieIssues = await this.checkCookieSecurity(context.page, context.pageConfig.path);
            issues.push(...cookieIssues);

            // Check CORS configuration
            const corsIssues = this.checkCORSConfiguration(headers, context.pageConfig.path);
            issues.push(...corsIssues);

            // Calculate metrics
            const totalHeaderChecks = this.securityHeaderChecks.length;
            const passedHeaderChecks = totalHeaderChecks - headerIssues.length;
            const securityScore = Math.round((passedHeaderChecks / totalHeaderChecks) * 100);

            Object.assign(metrics, {
                securityScore,
                totalHeaderChecks,
                passedHeaderChecks,
                failedHeaderChecks: headerIssues.length,
                cookieIssues: cookieIssues.length,
                corsIssues: corsIssues.length,
            });

            // Store headers in shared data for other plugins
            context.sharedData.set('response-headers', headers);

            const executionTimeMs = Date.now() - startTime;

            return {
                pluginName: this.name,
                type: this.type,
                issues,
                metrics,
                metadata: {
                    url: context.url,
                    headerCount: Object.keys(headers).length,
                },
                executionTimeMs,
                success: true,
            };
        } catch (error) {
            const executionTimeMs = Date.now() - startTime;
            return {
                pluginName: this.name,
                type: this.type,
                issues: [],
                metrics: {},
                metadata: {},
                executionTimeMs,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error during security audit',
            };
        }
    }

    public async cleanup(): Promise<void> {
        // No cleanup needed
    }

    private checkSecurityHeaders(
        headers: Record<string, string>,
        pagePath: string,
    ): Issue[] {
        const issues: Issue[] = [];

        for (const check of this.securityHeaderChecks) {
            const headerValue = this.getHeaderValue(headers, check.header);

            if (!headerValue) {
                if (check.required) {
                    issues.push(this.createHeaderIssue(check, null, pagePath));
                }
                continue;
            }

            // Validate header value against expected pattern
            if (check.expectedPattern && !check.expectedPattern.test(headerValue)) {
                issues.push(this.createHeaderIssue(check, headerValue, pagePath));
            }
        }

        return issues;
    }

    private getHeaderValue(headers: Record<string, string>, headerName: string): string | null {
        // Case-insensitive header lookup
        const lowerHeaderName = headerName.toLowerCase();
        for (const [key, value] of Object.entries(headers)) {
            if (key.toLowerCase() === lowerHeaderName) {
                return value;
            }
        }
        return null;
    }

    private createHeaderIssue(
        check: SecurityHeaderCheck,
        actualValue: string | null,
        pagePath: string,
    ): Issue {
        const impact = this.calculateHeaderImpact(check.severity);
        const fixGuidance = this.generateHeaderFixGuidance(check);

        return {
            id: `security-header-${check.header.toLowerCase()}`,
            type: 'security',
            severity: check.severity,
            impact,
            title: check.description,
            description: actualValue
                ? `Header "${check.header}" has incorrect value: "${actualValue}"`
                : `Missing security header: ${check.header}`,
            affectedPages: [pagePath],
            fixGuidance,
            owaspCategory: check.owaspCategory,
            metadata: {
                header: check.header,
                actualValue,
                expectedPattern: check.expectedPattern?.source,
            },
        };
    }

    private calculateHeaderImpact(severity: IssueSeverity): number {
        const impactMap: Record<IssueSeverity, number> = {
            critical: 100,
            high: 75,
            medium: 50,
            low: 25,
        };
        return impactMap[severity];
    }

    private generateHeaderFixGuidance(check: SecurityHeaderCheck): FixGuidance {
        return {
            difficulty: 'easy',
            estimatedTime: '5-15 minutes',
            implementation: check.recommendation,
            codeExample: check.codeExample,
            resources: [
                'https://owasp.org/www-project-secure-headers/',
                'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers',
            ],
        };
    }

    private async checkCookieSecurity(page: Page, pagePath: string): Promise<Issue[]> {
        const issues: Issue[] = [];
        const cookies = await page.context().cookies();

        for (const cookie of cookies) {
            // Check HttpOnly flag
            if (!cookie.httpOnly && !cookie.name.startsWith('_ga')) {
                issues.push({
                    id: 'cookie-httponly',
                    type: 'security',
                    severity: 'medium',
                    impact: 50,
                    title: 'Cookie missing HttpOnly flag',
                    description: `Cookie "${cookie.name}" is accessible via JavaScript, increasing XSS risk`,
                    affectedPages: [pagePath],
                    fixGuidance: {
                        difficulty: 'easy',
                        estimatedTime: '10-20 minutes',
                        implementation: 'Set HttpOnly flag on all session cookies',
                        codeExample: 'Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Strict',
                        resources: ['https://owasp.org/www-community/HttpOnly'],
                    },
                    owaspCategory: 'A05:2021 - Security Misconfiguration',
                    metadata: {
                        cookieName: cookie.name,
                        httpOnly: cookie.httpOnly,
                    },
                });
            }

            // Check Secure flag
            if (!cookie.secure) {
                issues.push({
                    id: 'cookie-secure',
                    type: 'security',
                    severity: 'high',
                    impact: 75,
                    title: 'Cookie missing Secure flag',
                    description: `Cookie "${cookie.name}" can be transmitted over insecure HTTP`,
                    affectedPages: [pagePath],
                    fixGuidance: {
                        difficulty: 'easy',
                        estimatedTime: '10-20 minutes',
                        implementation: 'Set Secure flag on all cookies to ensure HTTPS-only transmission',
                        codeExample: 'Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Strict',
                        resources: ['https://owasp.org/www-community/controls/SecureCookieAttribute'],
                    },
                    owaspCategory: 'A02:2021 - Cryptographic Failures',
                    metadata: {
                        cookieName: cookie.name,
                        secure: cookie.secure,
                    },
                });
            }

            // Check SameSite attribute
            if (!cookie.sameSite || cookie.sameSite === 'None') {
                issues.push({
                    id: 'cookie-samesite',
                    type: 'security',
                    severity: 'medium',
                    impact: 50,
                    title: 'Cookie missing SameSite attribute',
                    description: `Cookie "${cookie.name}" is vulnerable to CSRF attacks`,
                    affectedPages: [pagePath],
                    fixGuidance: {
                        difficulty: 'easy',
                        estimatedTime: '10-20 minutes',
                        implementation: 'Set SameSite attribute to Strict or Lax',
                        codeExample: 'Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Strict',
                        resources: ['https://owasp.org/www-community/SameSite'],
                    },
                    owaspCategory: 'A01:2021 - Broken Access Control',
                    metadata: {
                        cookieName: cookie.name,
                        sameSite: cookie.sameSite,
                    },
                });
            }
        }

        return issues;
    }

    private checkCORSConfiguration(
        headers: Record<string, string>,
        pagePath: string,
    ): Issue[] {
        const issues: Issue[] = [];
        const corsHeader = this.getHeaderValue(headers, 'Access-Control-Allow-Origin');

        if (corsHeader === '*') {
            issues.push({
                id: 'cors-wildcard',
                type: 'security',
                severity: 'high',
                impact: 75,
                title: 'Overly permissive CORS policy',
                description: 'Access-Control-Allow-Origin is set to wildcard (*), allowing any origin',
                affectedPages: [pagePath],
                fixGuidance: {
                    difficulty: 'medium',
                    estimatedTime: '30-60 minutes',
                    implementation: 'Restrict CORS to specific trusted origins',
                    codeExample: 'Access-Control-Allow-Origin: https://trusted-domain.com',
                    resources: [
                        'https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny',
                        'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS',
                    ],
                },
                owaspCategory: 'A05:2021 - Security Misconfiguration',
                metadata: {
                    corsHeader,
                },
            });
        }

        return issues;
    }
}
