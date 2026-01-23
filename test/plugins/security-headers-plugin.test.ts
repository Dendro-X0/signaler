import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityHeadersPlugin } from '../../src/plugins/security/security-headers-plugin.js';
import type { AuditContext, PluginConfig } from '../../src/core/plugin-interface.js';

describe('SecurityHeadersPlugin', () => {
    let plugin: SecurityHeadersPlugin;
    let mockContext: AuditContext;

    beforeEach(() => {
        plugin = new SecurityHeadersPlugin();

        mockContext = {
            url: 'https://localhost:3000/test',
            page: {} as any,
            device: 'desktop',
            pageConfig: {
                path: '/test',
                label: 'Test Page',
                scope: 'public',
            },
            sharedData: new Map(),
            metadata: {
                startTime: Date.now(),
                buildId: 'test-build',
                environment: 'test',
            },
        };
    });

    describe('Plugin Metadata', () => {
        it('should have correct plugin metadata', () => {
            expect(plugin.name).toBe('security-headers');
            expect(plugin.version).toBe('1.0.0');
            expect(plugin.type).toBe('security');
            expect(plugin.phase).toBe(1);
            expect(plugin.dependencies).toEqual([]);
        });
    });

    describe('Configuration', () => {
        it('should accept valid configuration', async () => {
            const config: PluginConfig = {
                enabled: true,
                settings: {},
            };

            await expect(plugin.configure(config)).resolves.toBeUndefined();
        });

        it('should validate enabled configuration', () => {
            const validConfig: PluginConfig = {
                enabled: true,
                settings: {},
            };

            expect(plugin.validate(validConfig)).toBe(true);
        });
    });

    describe('Security Header Detection', () => {
        it('should detect missing HSTS header', async () => {
            const mockResponse = {
                headers: () => ({
                    'content-type': 'text/html',
                }),
            };

            mockContext.page = {
                goto: async () => mockResponse,
                context: () => ({
                    cookies: async () => [],
                }),
            } as any;

            const result = await plugin.audit(mockContext);

            const hstsIssue = result.issues.find((issue) =>
                issue.id === 'security-header-strict-transport-security'
            );
            expect(hstsIssue).toBeDefined();
            expect(hstsIssue?.severity).toBe('high');
            expect(hstsIssue?.owaspCategory).toContain('A05:2021');
        });

        it('should detect missing CSP header', async () => {
            const mockResponse = {
                headers: () => ({
                    'strict-transport-security': 'max-age=31536000',
                }),
            };

            mockContext.page = {
                goto: async () => mockResponse,
                context: () => ({
                    cookies: async () => [],
                }),
            } as any;

            const result = await plugin.audit(mockContext);

            const cspIssue = result.issues.find((issue) =>
                issue.id === 'security-header-content-security-policy'
            );
            expect(cspIssue).toBeDefined();
            expect(cspIssue?.severity).toBe('critical');
        });

        it('should validate correct security headers', async () => {
            const mockResponse = {
                headers: () => ({
                    'strict-transport-security': 'max-age=31536000; includeSubDomains',
                    'x-frame-options': 'DENY',
                    'x-content-type-options': 'nosniff',
                    'content-security-policy': "default-src 'self'",
                    'referrer-policy': 'strict-origin-when-cross-origin',
                }),
            };

            mockContext.page = {
                goto: async () => mockResponse,
                context: () => ({
                    cookies: async () => [],
                }),
            } as any;

            const result = await plugin.audit(mockContext);

            // Should have minimal issues (only optional headers)
            const criticalIssues = result.issues.filter((issue) =>
                issue.severity === 'critical' || issue.severity === 'high'
            );
            expect(criticalIssues.length).toBeLessThan(2);
        });

        it('should detect incorrect X-Frame-Options value', async () => {
            const mockResponse = {
                headers: () => ({
                    'x-frame-options': 'ALLOW-FROM https://example.com',
                }),
            };

            mockContext.page = {
                goto: async () => mockResponse,
                context: () => ({
                    cookies: async () => [],
                }),
            } as any;

            const result = await plugin.audit(mockContext);

            const xfoIssue = result.issues.find((issue) =>
                issue.id === 'security-header-x-frame-options'
            );
            expect(xfoIssue).toBeDefined();
            expect(xfoIssue?.description).toContain('incorrect value');
        });
    });

    describe('Cookie Security', () => {
        it('should detect cookies without HttpOnly flag', async () => {
            const mockResponse = {
                headers: () => ({}),
            };

            const insecureCookie = {
                name: 'sessionId',
                value: 'abc123',
                httpOnly: false,
                secure: true,
                sameSite: 'Strict' as const,
                domain: 'localhost',
                path: '/',
                expires: -1,
            };

            mockContext.page = {
                goto: async () => mockResponse,
                context: () => ({
                    cookies: async () => [insecureCookie],
                }),
            } as any;

            const result = await plugin.audit(mockContext);

            const httpOnlyIssue = result.issues.find((issue) =>
                issue.id === 'cookie-httponly'
            );
            expect(httpOnlyIssue).toBeDefined();
            expect(httpOnlyIssue?.severity).toBe('medium');
        });

        it('should detect cookies without Secure flag', async () => {
            const mockResponse = {
                headers: () => ({}),
            };

            const insecureCookie = {
                name: 'sessionId',
                value: 'abc123',
                httpOnly: true,
                secure: false,
                sameSite: 'Strict' as const,
                domain: 'localhost',
                path: '/',
                expires: -1,
            };

            mockContext.page = {
                goto: async () => mockResponse,
                context: () => ({
                    cookies: async () => [insecureCookie],
                }),
            } as any;

            const result = await plugin.audit(mockContext);

            const secureIssue = result.issues.find((issue) =>
                issue.id === 'cookie-secure'
            );
            expect(secureIssue).toBeDefined();
            expect(secureIssue?.severity).toBe('high');
        });

        it('should detect cookies without SameSite attribute', async () => {
            const mockResponse = {
                headers: () => ({}),
            };

            const insecureCookie = {
                name: 'sessionId',
                value: 'abc123',
                httpOnly: true,
                secure: true,
                sameSite: undefined as any,
                domain: 'localhost',
                path: '/',
                expires: -1,
            };

            mockContext.page = {
                goto: async () => mockResponse,
                context: () => ({
                    cookies: async () => [insecureCookie],
                }),
            } as any;

            const result = await plugin.audit(mockContext);

            const sameSiteIssue = result.issues.find((issue) =>
                issue.id === 'cookie-samesite'
            );
            expect(sameSiteIssue).toBeDefined();
            expect(sameSiteIssue?.severity).toBe('medium');
        });

        it('should ignore analytics cookies for HttpOnly check', async () => {
            const mockResponse = {
                headers: () => ({}),
            };

            const analyticsCookie = {
                name: '_ga',
                value: 'GA1.1.123456789.1234567890',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax' as const,
                domain: 'localhost',
                path: '/',
                expires: -1,
            };

            mockContext.page = {
                goto: async () => mockResponse,
                context: () => ({
                    cookies: async () => [analyticsCookie],
                }),
            } as any;

            const result = await plugin.audit(mockContext);

            const httpOnlyIssue = result.issues.find((issue) =>
                issue.id === 'cookie-httponly' && issue.metadata?.cookieName === '_ga'
            );
            expect(httpOnlyIssue).toBeUndefined();
        });
    });

    describe('CORS Configuration', () => {
        it('should detect wildcard CORS policy', async () => {
            const mockResponse = {
                headers: () => ({
                    'access-control-allow-origin': '*',
                }),
            };

            mockContext.page = {
                goto: async () => mockResponse,
                context: () => ({
                    cookies: async () => [],
                }),
            } as any;

            const result = await plugin.audit(mockContext);

            const corsIssue = result.issues.find((issue) =>
                issue.id === 'cors-wildcard'
            );
            expect(corsIssue).toBeDefined();
            expect(corsIssue?.severity).toBe('high');
            expect(corsIssue?.owaspCategory).toContain('A05:2021');
        });

        it('should accept specific CORS origins', async () => {
            const mockResponse = {
                headers: () => ({
                    'access-control-allow-origin': 'https://trusted-domain.com',
                }),
            };

            mockContext.page = {
                goto: async () => mockResponse,
                context: () => ({
                    cookies: async () => [],
                }),
            } as any;

            const result = await plugin.audit(mockContext);

            const corsIssue = result.issues.find((issue) =>
                issue.id === 'cors-wildcard'
            );
            expect(corsIssue).toBeUndefined();
        });
    });

    describe('Metrics Calculation', () => {
        it('should calculate security score', async () => {
            const mockResponse = {
                headers: () => ({
                    'strict-transport-security': 'max-age=31536000',
                    'x-frame-options': 'DENY',
                    'x-content-type-options': 'nosniff',
                }),
            };

            mockContext.page = {
                goto: async () => mockResponse,
                context: () => ({
                    cookies: async () => [],
                }),
            } as any;

            const result = await plugin.audit(mockContext);

            expect(result.metrics.securityScore).toBeGreaterThan(0);
            expect(result.metrics.securityScore).toBeLessThanOrEqual(100);
            expect(result.metrics.totalHeaderChecks).toBeGreaterThan(0);
            expect(result.metrics.passedHeaderChecks).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle page navigation errors', async () => {
            mockContext.page = {
                goto: async () => {
                    throw new Error('Navigation failed');
                },
            } as any;

            const result = await plugin.audit(mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Navigation failed');
        });
    });

    describe('Shared Data', () => {
        it('should store headers in shared data', async () => {
            const headers = {
                'content-type': 'text/html',
                'x-custom-header': 'value',
            };

            const mockResponse = {
                headers: () => headers,
            };

            mockContext.page = {
                goto: async () => mockResponse,
                context: () => ({
                    cookies: async () => [],
                }),
            } as any;

            await plugin.audit(mockContext);

            expect(mockContext.sharedData.get('response-headers')).toEqual(headers);
        });
    });
});
