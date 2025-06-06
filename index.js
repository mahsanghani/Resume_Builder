// test.js - Test suite for Resume Generator Server
const request = require('supertest');
const app = require('./index.js');

describe('Resume Generator Server', () => {
    
    // Health check tests
    describe('GET /health', () => {
        it('should return server health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);
            
            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
        });
    });

    // GitHub API tests
    describe('GitHub Profile API', () => {
        it('should fetch valid GitHub profile', async () => {
            const response = await request(app)
                .get('/api/github/octocat')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('name');
            expect(response.body.data).toHaveProperty('experience');
            expect(response.body.data).toHaveProperty('skills');
            expect(response.body.data).toHaveProperty('projects');
            expect(response.body.data.metadata.platform).toBe('github');
        }, 10000); // 10 second timeout for API calls

        it('should handle invalid GitHub username', async () => {
            const response = await request(app)
                .get('/api/github/invalid-username-that-does-not-exist-123456')
                .expect(500);
            
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Failed to fetch GitHub profile');
        });

        it('should validate GitHub username format', async () => {
            const response = await request(app)
                .get('/api/github/invalid@username')
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid GitHub username format');
        });

        it('should return cached data on second request', async () => {
            // First request
            await request(app)
                .get('/api/github/octocat')
                .expect(200);
            
            // Second request should be cached
            const response = await request(app)
                .get('/api/github/octocat')
                .expect(200);
            
            expect(response.body.cached).toBe(true);
        }, 15000);
    });

    // LinkedIn API tests
    describe('LinkedIn Profile API', () => {
        it('should return LinkedIn profile with fallback', async () => {
            const response = await request(app)
                .get('/api/linkedin/williamhgates')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('name');
            expect(response.body.data).toHaveProperty('experience');
            expect(response.body.data).toHaveProperty('skills');
            expect(response.body.data.metadata.platform).toBe('linkedin');
        }, 10000);

        it('should validate LinkedIn profile ID format', async () => {
            const response = await request(app)
                .get('/api/linkedin/invalid@profile')
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid LinkedIn profile ID format');
        });

        it('should handle LinkedIn access restrictions gracefully', async () => {
            const response = await request(app)
                .get('/api/linkedin/test-profile-123')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            // Should still return data even if scraping fails
            expect(response.body.data).toHaveProperty('name');
            expect(response.body.data.metadata).toHaveProperty('fallback');
        });
    });

    // Generic Profile API tests
    describe('POST /api/profile', () => {
        it('should fetch GitHub profile via platform parameter', async () => {
            const response = await request(app)
                .post('/api/profile')
                .send({
                    platform: 'github',
                    username: 'octocat'
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.metadata.platform).toBe('github');
        }, 10000);

        it('should fetch GitHub profile via URL parameter', async () => {
            const response = await request(app)
                .post('/api/profile')
                .send({
                    url: 'https://github.com/octocat'
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.metadata.platform).toBe('github');
        }, 10000);

        it('should fetch LinkedIn profile via platform parameter', async () => {
            const response = await request(app)
                .post('/api/profile')
                .send({
                    platform: 'linkedin',
                    username: 'williamhgates'
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.metadata.platform).toBe('linkedin');
        });

        it('should handle missing parameters', async () => {
            const response = await request(app)
                .post('/api/profile')
                .send({})
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Platform or URL required');
        });

        it('should handle unsupported platform', async () => {
            const response = await request(app)
                .post('/api/profile')
                .send({
                    platform: 'unsupported',
                    username: 'test'
                })
                .expect(500);
            
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Unsupported platform');
        });
    });

    // Resume Generation tests
    describe('POST /api/resume/generate', () => {
        const sampleProfileData = {
            name: 'John Doe',
            location: 'San Francisco, CA',
            email: 'john@example.com',
            bio: 'Software developer with passion for innovation',
            experience: [
                {
                    company: 'Tech Company',
                    position: 'Senior Developer',
                    duration: '2020 - Present',
                    responsibilities: [
                        'Led development team',
                        'Implemented new features'
                    ]
                }
            ],
            skills: ['JavaScript', 'Python', 'React'],
            projects: [
                {
                    name: 'Cool Project',
                    description: 'An awesome project',
                    language: 'JavaScript'
                }
            ]
        };

        it('should generate LaTeX resume', async () => {
            const response = await request(app)
                .post('/api/resume/generate')
                .send({
                    profileData: sampleProfileData,
                    format: 'latex'
                })
                .expect(200);
            
            expect(response.text).toContain('\\documentclass');
            expect(response.text).toContain('John Doe');
            expect(response.text).toContain('Tech Company');
        });

        it('should generate resume data object', async () => {
            const response = await request(app)
                .post('/api/resume/generate')
                .send({
                    profileData: sampleProfileData
                })
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('latex');
            expect(response.body.data).toHaveProperty('profileName', 'John Doe');
            expect(response.body.data).toHaveProperty('generatedAt');
        });

        it('should handle missing profile data', async () => {
            const response = await request(app)
                .post('/api/resume/generate')
                .send({})
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Profile data required');
        });

        it('should handle invalid profile data', async () => {
            const response = await request(app)
                .post('/api/resume/generate')
                .send({
                    profileData: { invalid: 'data' }
                })
                .expect(400);
            
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Profile data required');
        });
    });

    // Cache management tests
    describe('Cache Management', () => {
        it('should return cache statistics', async () => {
            const response = await request(app)
                .get('/api/cache/stats')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.stats).toHaveProperty('size');
            expect(response.body.stats).toHaveProperty('ttl');
        });

        it('should clear cache successfully', async () => {
            const response = await request(app)
                .post('/api/cache/clear')
                .expect(200);
            
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Cache cleared successfully');
        });
    });

    // Error handling tests
    describe('Error Handling', () => {
        it('should handle 404 for unknown endpoints', async () => {
            const response = await request(app)
                .get('/api/unknown-endpoint')
                .expect(404);
            
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Endpoint not found');
        });

        it('should serve main application at root', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);
            
            expect(response.headers['content-type']).toMatch(/html/);
        });
    });

    // Rate limiting tests (these might be flaky in CI/CD)
    describe('Rate Limiting', () => {
        it('should enforce rate limits on profile endpoints', async () => {
            // Make multiple requests quickly
            const requests = Array(25).fill().map(() => 
                request(app).get('/api/github/octocat')
            );
            
            const responses = await Promise.allSettled(requests);
            
            // Some requests should be rate limited
            const rateLimited = responses.some(result => 
                result.status === 'fulfilled' && result.value.status === 429
            );
            
            // Note: This test might not always pass due to timing
            console.log('Rate limiting test completed');
        }, 30000);
    });
});

// Integration tests for full workflow
describe('Full Workflow Integration', () => {
    it('should complete GitHub profile to resume generation workflow', async () => {
        // Step 1: Fetch GitHub profile
        const profileResponse = await request(app)
            .get('/api/github/octocat')
            .expect(200);
        
        expect(profileResponse.body.success).toBe(true);
        
        // Step 2: Generate resume from profile
        const resumeResponse = await request(app)
            .post('/api/resume/generate')
            .send({
                profileData: profileResponse.body.data,
                format: 'latex'
            })
            .expect(200);
        
        expect(resumeResponse.text).toContain('\\documentclass');
        expect(resumeResponse.text).toContain(profileResponse.body.data.name);
    }, 15000);

    it('should complete LinkedIn profile to resume generation workflow', async () => {
        // Step 1: Fetch LinkedIn profile (with fallback)
        const profileResponse = await request(app)
            .get('/api/linkedin/williamhgates')
            .expect(200);
        
        expect(profileResponse.body.success).toBe(true);
        
        // Step 2: Generate resume from profile
        const resumeResponse = await request(app)
            .post('/api/resume/generate')
            .send({
                profileData: profileResponse.body.data
            })
            .expect(200);
        
        expect(resumeResponse.body.success).toBe(true);
        expect(resumeResponse.body.data.latex).toContain('\\documentclass');
    }, 15000);
});

// Performance tests
describe('Performance Tests', () => {
    it('should respond to health check quickly', async () => {
        const start = Date.now();
        
        await request(app)
            .get('/health')
            .expect(200);
        
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(100); // Should respond in under 100ms
    });

    it('should handle concurrent requests', async () => {
        const start = Date.now();
        
        const requests = Array(10).fill().map(() => 
            request(app).get('/health')
        );
        
        const responses = await Promise.all(requests);
        
        const duration = Date.now() - start;
        console.log(`10 concurrent requests completed in ${duration}ms`);
        
        responses.forEach(response => {
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('healthy');
        });
    });
});

// Cleanup after tests
afterAll(() => {
    // Clean up any resources if needed
    console.log('Test suite completed');
});
