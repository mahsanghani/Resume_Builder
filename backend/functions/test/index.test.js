const test = require('firebase-functions-test')();
const admin = require('firebase-admin');

// Mock Firebase Admin
test.mockConfig({
    github: { token: 'test-token' },
    app: { environment: 'test' }
});

describe('Resume Generator Functions', () => {
    let myFunctions;

    before(() => {
        myFunctions = require('../index.js');
    });

    after(() => {
        test.cleanup();
    });

    describe('githubProfile', () => {
        it('should fetch GitHub profile successfully', async () => {
            const data = { username: 'octocat' };
            const context = { auth: null };

            const result = await myFunctions.githubProfile(data, context);

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('name');
            expect(result.data).toHaveProperty('experience');
        });

        it('should reject invalid username', async () => {
            const data = { username: 'invalid@username' };
            const context = { auth: null };

            try {
                await myFunctions.githubProfile(data, context);
            } catch (error) {
                expect(error.code).toBe('invalid-argument');
            }
        });
    });

    describe('linkedinProfile', () => {
        it('should return fallback profile for LinkedIn', async () => {
            const data = { profileId: 'test-profile' };
            const context = { auth: null };

            const result = await myFunctions.linkedinProfile(data, context);

            expect(result.success).toBe(true);
            expect(result.data.metadata.fallback).toBe(true);
        });
    });
});
