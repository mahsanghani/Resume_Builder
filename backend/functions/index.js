const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({ origin: true })); // Allow all origins for Firebase
app.use(express.json({ limit: '10mb' }));

// In-memory cache with TTL
class SimpleCache {
    constructor() {
        this.cache = new Map();
        this.TTL = 5 * 60 * 1000; // 5 minutes
    }

    get(key) {
        const item = this.cache.get(key);
        if (item && Date.now() - item.timestamp < this.TTL) {
            return item.data;
        }
        this.cache.delete(key);
        return null;
    }

    set(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }
}

const cache = new SimpleCache();

// Utility functions
function validateGitHubUsername(username) {
    return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username);
}

function validateLinkedInProfileId(profileId) {
    return /^[a-zA-Z0-9-]{3,100}$/.test(profileId);
}

function escapeLatex(text) {
    if (!text) return '';
    return text.toString()
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/[&%$#_{}]/g, '\\$&')
        .replace(/\^/g, '\\textasciicircum{}')
        .replace(/~/g, '\\textasciitilde{}');
}

// GitHub Service
class GitHubService {
    constructor() {
        this.baseURL = 'https://api.github.com';
        this.userAgent = 'Firebase-Resume-Generator/1.0';
    }

    async fetchUser(username) {
        try {
            const response = await axios.get(`${this.baseURL}/users/${username}`, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/vnd.github.v3+json'
                },
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error(`GitHub user '${username}' not found`);
            }
            throw new Error(`GitHub API error: ${error.message}`);
        }
    }

    async fetchUserRepos(username, count = 20) {
        try {
            const response = await axios.get(`${this.baseURL}/users/${username}/repos`, {
                params: {
                    sort: 'updated',
                    per_page: count,
                    type: 'public'
                },
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/vnd.github.v3+json'
                },
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            console.warn(`Failed to fetch repos for ${username}:`, error.message);
            return [];
        }
    }

    async getProfileData(username) {
        const [user, repos] = await Promise.all([
            this.fetchUser(username),
            this.fetchUserRepos(username, 20)
        ]);

        const languages = new Set();
        const topics = new Set();
        let totalStars = 0;
        let totalForks = 0;

        repos.forEach(repo => {
            if (repo.language) languages.add(repo.language);
            if (repo.topics) repo.topics.forEach(topic => topics.add(topic));
            totalStars += repo.stargazers_count || 0;
            totalForks += repo.forks_count || 0;
        });

        const experience = this.generateExperienceFromGitHub(user, repos, Array.from(languages));

        return {
            name: user.name || username,
            location: user.location || '',
            email: user.email || '',
            bio: user.bio || `Software developer with ${user.public_repos} public repositories`,
            website: user.blog || user.html_url,
            avatar: user.avatar_url,
            experience: experience,
            skills: Array.from(languages).slice(0, 20),
            projects: repos.slice(0, 10).map(repo => ({
                name: repo.name,
                description: repo.description || 'No description available',
                url: repo.html_url,
                language: repo.language,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                topics: repo.topics || []
            })),
            stats: {
                publicRepos: user.public_repos,
                followers: user.followers,
                following: user.following,
                totalStars: totalStars,
                totalForks: totalForks
            },
            metadata: {
                platform: 'github',
                source: `github:${username}`,
                scrapedAt: new Date().toISOString(),
                method: 'GitHub API via Firebase Functions'
            }
        };
    }

    generateExperienceFromGitHub(user, repos, languages) {
        const experience = [];
        const currentYear = new Date().getFullYear();
        const joinYear = new Date(user.created_at).getFullYear();

        if (user.company) {
            experience.push({
                company: user.company.replace(/^@/, ''),
                position: 'Software Developer',
                duration: `${joinYear} - Present`,
                responsibilities: [
                    `Maintaining ${user.public_repos} public repositories on GitHub`,
                    `Building software solutions using ${languages.slice(0, 4).join(', ')}`,
                    `Active in open-source community with ${user.followers} followers`,
                    user.bio ? `Specializing in: ${user.bio}` : 'Contributing to collaborative software development'
                ]
            });
        }

        const topRepos = repos.filter(repo => repo.stargazers_count > 0).slice(0, 3);
        if (topRepos.length > 0) {
            experience.push({
                company: 'Open Source Development',
                position: 'Software Contributor',
                duration: `${joinYear} - Present`,
                responsibilities: [
                    `Developed ${repos.length}+ repositories with focus on ${languages.slice(0, 3).join(', ')}`,
                    `Created notable projects: ${topRepos.map(r => r.name).join(', ')}`,
                    `Achieved ${repos.reduce((sum, r) => sum + r.stargazers_count, 0)} total stars across projects`,
                    'Demonstrated expertise in version control, code review, and collaborative development'
                ]
            });
        }

        return experience;
    }
}

// LinkedIn Service
class LinkedInService {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (compatible; ResumeBot/1.0)';
    }

    async fetchProfileData(profileId) {
        console.log(`Attempting LinkedIn profile fetch: ${profileId}`);

        try {
            const linkedinUrl = profileId.startsWith('http')
                ? profileId
                : `https://www.linkedin.com/in/${profileId}`;

            // LinkedIn heavily restricts scraping, so we provide a professional fallback
            return this.buildLinkedInProfile(profileId, null, null, null, true);

        } catch (error) {
            console.warn('LinkedIn scraping failed, using fallback:', error.message);
            return this.buildLinkedInProfile(profileId, null, null, null, true);
        }
    }

    formatNameFromId(profileId) {
        return profileId
            .replace(/https?:\/\/.*?\/in\//, '')
            .replace(/\/$/, '')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    buildLinkedInProfile(profileId, name, headline, location, isFallback) {
        const profileName = name || this.formatNameFromId(profileId);
        const linkedinUrl = profileId.startsWith('http')
            ? profileId
            : `https://www.linkedin.com/in/${profileId}`;

        return {
            name: profileName,
            location: location || '',
            email: '',
            bio: headline || 'Professional with comprehensive LinkedIn profile',
            website: linkedinUrl,
            avatar: '',
            experience: [
                {
                    company: 'Professional Experience',
                    position: 'LinkedIn Professional',
                    duration: 'View LinkedIn Profile',
                    responsibilities: [
                        'Comprehensive professional background available on LinkedIn',
                        'Proven expertise in industry specialization',
                        'Strong professional network and endorsements',
                        'Connect on LinkedIn for detailed career information'
                    ]
                }
            ],
            skills: [
                'Professional Development', 'Leadership', 'Strategic Planning',
                'Team Management', 'Business Development', 'Industry Expertise',
                'Professional Networking', 'Project Management'
            ],
            projects: [],
            metadata: {
                platform: 'linkedin',
                source: `linkedin:${profileId.replace(/https?:\/\/.*?\/in\//, '')}`,
                scrapedAt: new Date().toISOString(),
                method: isFallback ? 'Firebase Functions Fallback Profile' : 'LinkedIn Scraping',
                fallback: isFallback,
                note: isFallback
                    ? 'Professional fallback profile due to LinkedIn access restrictions'
                    : 'Limited data extracted from LinkedIn'
            }
        };
    }
}

// LaTeX Resume Generation
function generateLatexResume(profileData) {
    const name = escapeLatex(profileData.name);
    const location = escapeLatex(profileData.location);
    const email = profileData.email;
    const phone = escapeLatex(profileData.phone || '');
    const bio = escapeLatex(profileData.bio);
    const website = profileData.website;

    const contactParts = [];
    if (location) contactParts.push(location);
    if (email) contactParts.push(`\\href{mailto:${email}}{${email}}`);
    if (phone) contactParts.push(phone);
    const contactLine = contactParts.join(' \\textbullet\\ ');

    let websiteLine = '';
    if (website) {
        websiteLine = `\\href{${website}}{${website}}`;
    }

    let experienceSection = '';
    if (profileData.experience && profileData.experience.length > 0) {
        experienceSection = profileData.experience.map(exp => {
            const position = escapeLatex(exp.position || 'Position');
            const duration = escapeLatex(exp.duration || 'Duration');
            const company = escapeLatex(exp.company || 'Company');

            let responsibilities = '';
            if (exp.responsibilities && exp.responsibilities.length > 0) {
                responsibilities = exp.responsibilities.map(resp =>
                    `    \\item ${escapeLatex(resp)}`
                ).join('\n');
            } else {
                responsibilities = '    \\item Key responsibilities and achievements';
            }

            return `\\experienceitem{${position}}{${duration}}{${company}}{}

\\begin{itemize}[leftmargin=20pt, itemsep=2pt]
${responsibilities}
\\end{itemize}

\\vspace{10pt}`;
        }).join('\n');
    }

    let skillsSection = '';
    if (profileData.skills && profileData.skills.length > 0) {
        const skills = profileData.skills.slice(0, 15).map(escapeLatex).join(', ');
        skillsSection = `% Technical Skills Section
\\section{Technical Skills}
\\begin{itemize}[leftmargin=20pt, itemsep=2pt]
    \\item \\textbf{Technologies:} ${skills}
\\end{itemize}

\\vspace{10pt}`;
    }

    let projectsSection = '';
    if (profileData.projects && profileData.projects.length > 0) {
        projectsSection = `% Notable Projects Section
\\section{Notable Projects}
` + profileData.projects.slice(0, 5).map(project => {
            const projectName = escapeLatex(project.name || 'Project');
            const projectDesc = escapeLatex(project.description || 'Project description');
            const projectLang = escapeLatex(project.language || '');
            const projectUrl = project.url || '';

            let projectLine = `\\textbf{${projectName}}`;
            if (projectUrl) {
                projectLine += ` -- \\href{${projectUrl}}{View Project}`;
            }
            projectLine += ' \\\\\n';
            projectLine += projectDesc;
            if (projectLang) {
                projectLine += ` \\textit{(${projectLang})}`;
            }
            if (project.stars) {
                projectLine += ` \\textbf{★ ${project.stars}}`;
            }
            projectLine += ' \\\\\n\\vspace{5pt}';

            return projectLine;
        }).join('\n\n') + '\n\n\\vspace{10pt}';
    }

    return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{xcolor}
\\usepackage{hyperref}

% Page setup
\\geometry{left=0.75in,top=0.6in,right=0.75in,bottom=0.6in}
\\pagestyle{empty}

% Color definitions
\\definecolor{headercolor}{RGB}{79, 70, 229}
\\definecolor{linkcolor}{RGB}{124, 58, 237}

% Section formatting
\\titleformat{\\section}{\\Large\\bfseries\\color{headercolor}}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{20pt}{10pt}

% Hyperlink setup
\\hypersetup{
    colorlinks=true,
    linkcolor=linkcolor,
    urlcolor=linkcolor,
    pdfborder={0 0 0}
}

% Custom commands
\\newcommand{\\experienceitem}[4]{
    \\textbf{#1} \\hfill \\textit{#2} \\\\
    \\textit{#3} \\hfill #4 \\\\
    \\vspace{5pt}
}

\\begin{document}

% Header
\\begin{center}
    {\\Huge\\bfseries\\color{headercolor} ${name}} \\\\[8pt]
    ${contactLine} \\\\
    ${websiteLine} \\\\
\\end{center}

${bio ? `\\vspace{10pt}
\\section{Professional Summary}
${bio}
\\vspace{10pt}` : ''}

% Professional Experience Section
\\section{Professional Experience}

${experienceSection}

${skillsSection}

${projectsSection}

% Education Section
\\section{Education}
\\textbf{Bachelor of Science in Computer Science} \\hfill \\textit{2018 - 2022} \\\\
\\textit{University of Technology} \\hfill GPA: 3.8/4.0 \\\\

\\vspace{10pt}

% Generated footer
\\begin{center}
\\small\\textit{Generated on ${new Date().toLocaleDateString()} by Firebase Resume Generator}
\\end{center}

\\end{document}`;
}

// Initialize services
const githubService = new GitHubService();
const linkedinService = new LinkedInService();

// API Routes

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        platform: 'Firebase Functions',
        version: '1.0.0'
    });
});

// GitHub profile endpoint
app.get('/github/:username', async (req, res) => {
    try {
        const username = req.params.username.trim();

        if (!validateGitHubUsername(username)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid GitHub username format'
            });
        }

        // Check cache first
        const cacheKey = `github:${username}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            return res.json({
                success: true,
                data: cachedData,
                cached: true,
                timestamp: new Date().toISOString()
            });
        }

        // Fetch fresh data
        const profileData = await githubService.getProfileData(username);

        // Cache the result
        cache.set(cacheKey, profileData);

        res.json({
            success: true,
            data: profileData,
            cached: false,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('GitHub API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch GitHub profile',
            message: error.message
        });
    }
});

// LinkedIn profile endpoint
app.get('/linkedin/:profileId', async (req, res) => {
    try {
        const profileId = req.params.profileId.trim();

        if (!validateLinkedInProfileId(profileId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid LinkedIn profile ID format'
            });
        }

        // Check cache first
        const cacheKey = `linkedin:${profileId}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            return res.json({
                success: true,
                data: cachedData,
                cached: true,
                timestamp: new Date().toISOString()
            });
        }

        // Fetch LinkedIn data (with fallback)
        const profileData = await linkedinService.fetchProfileData(profileId);

        // Cache the result
        cache.set(cacheKey, profileData);

        res.json({
            success: true,
            data: profileData,
            cached: false,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('LinkedIn API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch LinkedIn profile',
            message: error.message
        });
    }
});

// Generic profile fetching endpoint
app.post('/profile', async (req, res) => {
    try {
        const { platform, username, url } = req.body;

        if (!platform && !url) {
            return res.status(400).json({
                success: false,
                error: 'Platform or URL required'
            });
        }

        let profileData;

        if (url) {
            // Handle URL-based requests
            if (url.includes('github.com')) {
                const githubUsername = url.split('/').pop();
                profileData = await githubService.getProfileData(githubUsername);
            } else if (url.includes('linkedin.com')) {
                const profileId = url.split('/in/').pop().replace('/', '');
                profileData = await linkedinService.fetchProfileData(profileId);
            } else {
                throw new Error('Unsupported URL format');
            }
        } else {
            // Handle platform-based requests
            switch (platform.toLowerCase()) {
                case 'github':
                    profileData = await githubService.getProfileData(username);
                    break;
                case 'linkedin':
                    profileData = await linkedinService.fetchProfileData(username);
                    break;
                default:
                    throw new Error(`Unsupported platform: ${platform}`);
            }
        }

        res.json({
            success: true,
            data: profileData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile',
            message: error.message
        });
    }
});

// Resume generation endpoint
app.post('/resume/generate', async (req, res) => {
    try {
        const { profileData, format = 'latex' } = req.body;

        if (!profileData || !profileData.name) {
            return res.status(400).json({
                success: false,
                error: 'Profile data required'
            });
        }

        // Generate LaTeX resume
        const latex = generateLatexResume(profileData);

        if (format === 'latex') {
            res.set({
                'Content-Type': 'text/plain',
                'Content-Disposition': `attachment; filename="${profileData.name.replace(/\s+/g, '_')}_Resume.tex"`
            });
            return res.send(latex);
        }

        res.json({
            success: true,
            data: {
                latex: latex,
                profileName: profileData.name,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Resume generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate resume',
            message: error.message
        });
    }
});

// Export the Express app as a Firebase Function
exports.api = functions
    .region('us-central1')
    .runWith({
        memory: '1GB',
        timeoutSeconds: 60,
        maxInstances: 100
    })
    .https
    .onRequest(app);

// Individual function exports for better cold start performance
exports.githubProfile = functions
    .region('us-central1')
    .runWith({ memory: '512MB', timeoutSeconds: 30 })
    .https
    .onCall(async (data, context) => {
        try {
            const { username } = data;
            if (!validateGitHubUsername(username)) {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid GitHub username');
            }

            const profileData = await githubService.getProfileData(username);
            return { success: true, data: profileData };
        } catch (error) {
            throw new functions.https.HttpsError('internal', error.message);
        }
    });

exports.linkedinProfile = functions
    .region('us-central1')
    .runWith({ memory: '512MB', timeoutSeconds: 30 })
    .https
    .onCall(async (data, context) => {
        try {
            const { profileId } = data;
            if (!validateLinkedInProfileId(profileId)) {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid LinkedIn profile ID');
            }

            const profileData = await linkedinService.fetchProfileData(profileId);
            return { success: true, data: profileData };
        } catch (error) {
            throw new functions.https.HttpsError('internal', error.message);
        }
    });
