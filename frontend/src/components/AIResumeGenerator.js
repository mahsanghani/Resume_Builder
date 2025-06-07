import React, { useState, useEffect } from 'react';

const AIResumeGenerator = () => {
    const [apiBaseUrl, setApiBaseUrl] = useState('https://us-central1-your-project.cloudfunctions.net/fetchProfileData');
    const [dataSource, setDataSource] = useState('github');
    const [userId, setUserId] = useState('octocat');
    const [profileUrl, setProfileUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [currentProfileData, setCurrentProfileData] = useState(null);
    const [currentLatexContent, setCurrentLatexContent] = useState('');
    const [showProfileSection, setShowProfileSection] = useState(false);
    const [showLatexSection, setShowLatexSection] = useState(false);
    const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);

    // Auto-hide success messages after 5 seconds
    useEffect(() => {
        if (message.type === 'success') {
            const timer = setTimeout(() => {
                setMessage({ text: '', type: '' });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const showMessage = (text, type = 'error') => {
        setMessage({ text, type });
    };

    const clearMessage = () => {
        setMessage({ text: '', type: '' });
    };

    const escapeLatex = (text) => {
        if (!text) return '';
        return text.toString()
            .replace(/\\/g, '\\textbackslash{}')
            .replace(/[&%$#_{}]/g, '\\$&')
            .replace(/\^/g, '\\textasciicircum{}')
            .replace(/~/g, '\\textasciitilde{}');
    };

    const handleDataSourceChange = (e) => {
        const sourceType = e.target.value;
        setDataSource(sourceType);

        if (sourceType === 'github') {
            setUserId('octocat');
        } else if (sourceType === 'linkedin') {
            setUserId('williamhgates');
        } else {
            setUserId('');
        }
    };

    const getInputPlaceholder = () => {
        switch (dataSource) {
            case 'github':
                return 'Enter GitHub username (e.g., octocat)';
            case 'linkedin':
                return 'Enter LinkedIn profile ID (e.g., john-doe-123456)';
            case 'website':
                return 'Enter personal website URL (e.g., https://johndoe.com)';
            case 'portfolio':
                return 'Enter portfolio URL (e.g., https://portfolio.example.com)';
            default:
                return 'Enter any profile URL';
        }
    };

    const getInputLabel = () => {
        switch (dataSource) {
            case 'github':
                return '👤 GitHub Username:';
            case 'linkedin':
                return '💼 LinkedIn Profile ID:';
            case 'website':
                return '🌐 Personal Website URL:';
            case 'portfolio':
                return '🎨 Portfolio URL:';
            default:
                return '🔗 Profile URL:';
        }
    };

    const isUrlType = () => {
        return ['url', 'website', 'portfolio'].includes(dataSource);
    };

    const fetchProfileData = async (sourceType, identifier) => {
        if (!apiBaseUrl.trim()) {
            throw new Error('Please configure the API URL');
        }

        try {
            let requestBody;

            if (isUrlType()) {
                requestBody = { url: identifier };
            } else {
                requestBody = { platform: sourceType, username: identifier };
            }

            console.log('Fetching profile:', requestBody);

            const response = await fetch(apiBaseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                let errorMessage;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || 'Unknown error';
                } catch (e) {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'API request failed');
            }

            return {
                name: result.data.name || 'Professional',
                location: result.data.location || '',
                email: result.data.email || '',
                phone: result.data.phone || '',
                bio: result.data.bio || '',
                website: result.data.website || '',
                experience: result.data.experience || [],
                skills: result.data.skills || [],
                projects: result.data.projects || [],
                avatar: result.data.avatar || '',
                metadata: result.data.metadata || {}
            };

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to the profile service');
            }
            throw error;
        }
    };

    const generateLatexResume = (profileData) => {
        const name = escapeLatex(profileData.name);
        const location = escapeLatex(profileData.location);
        const email = profileData.email;
        const phone = escapeLatex(profileData.phone);
        const bio = escapeLatex(profileData.bio);
        const website = profileData.website;

        // Build contact line
        const contactParts = [];
        if (location) contactParts.push(location);
        if (email) contactParts.push(`\\href{mailto:${email}}{${email}}`);
        if (phone) contactParts.push(phone);
        const contactLine = contactParts.join(' \\textbullet\\ ');

        // Build website line
        let websiteLine = '';
        if (website) {
            websiteLine += `\\href{${website}}{${website}}`;
        }
        if (profileData.metadata && profileData.metadata.platform === 'github') {
            try {
                const githubUser = profileData.metadata.source.split(':')[1];
                if (githubUser) {
                    if (websiteLine) websiteLine += ' \\textbullet\\ ';
                    websiteLine += `\\href{https://github.com/${githubUser}}{GitHub Profile}`;
                }
            } catch (e) {
                console.warn('Error processing GitHub metadata');
            }
        }

        // Build experience section
        let experienceSection = '';
        if (profileData.experience && profileData.experience.length > 0) {
            experienceSection = profileData.experience.map(exp => {
                const position = escapeLatex(exp.position || 'Position Not Specified');
                const duration = escapeLatex(exp.duration || 'Duration Not Specified');
                const company = escapeLatex(exp.company || 'Company Not Specified');

                let responsibilities = '';
                if (exp.responsibilities && exp.responsibilities.length > 0) {
                    responsibilities = exp.responsibilities.map(resp =>
                        `    \\item ${escapeLatex(resp)}`
                    ).join('\n');
                } else {
                    responsibilities = '    \\item Key responsibilities and achievements in this role';
                }

                return `\\experienceitem{${position}}{${duration}}{${company}}{}

\\begin{itemize}[leftmargin=20pt, itemsep=2pt]
${responsibilities}
\\end{itemize}

\\vspace{10pt}`;
            }).join('\n');
        } else {
            experienceSection = '\\textit{Experience information will be added based on available profile data.}\n\\vspace{10pt}';
        }

        // Build skills section
        let skillsSection = '';
        if (profileData.skills && profileData.skills.length > 0) {
            const primarySkills = profileData.skills.slice(0, 8).map(escapeLatex).join(', ');

            skillsSection = `% Technical Skills Section
\\section{Technical Skills}
\\begin{itemize}[leftmargin=20pt, itemsep=2pt]
    \\item \\textbf{Primary Technologies:} ${primarySkills}`;

            if (profileData.skills.length > 8) {
                const additionalSkills = profileData.skills.slice(8).map(escapeLatex).join(', ');
                skillsSection += `\n    \\item \\textbf{Additional Skills:} ${additionalSkills}`;
            }

            skillsSection += '\n\\end{itemize}\n\n\\vspace{10pt}';
        }

        // Build projects section
        let projectsSection = '';
        if (profileData.projects && profileData.projects.length > 0) {
            projectsSection = `% Notable Projects Section
\\section{Notable Projects}
` + profileData.projects.slice(0, 5).map(project => {
                const projectName = escapeLatex(project.name || 'Project');
                const projectDesc = escapeLatex(project.description || 'Project description not available');
                const projectLang = escapeLatex(project.language || '');
                const projectUrl = project.url || '';
                const projectStars = project.stars || '';

                let projectLine = `\\textbf{${projectName}}`;
                if (projectUrl) {
                    projectLine += ` -- \\href{${projectUrl}}{${projectUrl}}`;
                }
                projectLine += ' \\\\\n';
                projectLine += projectDesc;
                if (projectLang) {
                    projectLine += ` \\textit{(${projectLang})}`;
                }
                if (projectStars) {
                    projectLine += ` \\textbf{${projectStars} stars}`;
                }
                projectLine += ' \\\\\n\\vspace{5pt}';

                return projectLine;
            }).join('\n\n') + '\n\n\\vspace{10pt}';
        }

        // Bio section
        let bioSection = '';
        if (bio) {
            bioSection = `\\vspace{10pt}
\\section{Professional Summary}
${bio}
\\vspace{10pt}`;
        }

        const currentDate = new Date().toLocaleDateString();
        const platformName = profileData.metadata ? profileData.metadata.platform : 'profile';

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
\\definecolor{textcolor}{RGB}{55, 65, 81}
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
    \\color{textcolor}
    ${contactLine} \\\\
    ${websiteLine} \\\\
\\end{center}

${bioSection}

% Professional Experience Section
\\section{Professional Experience}

${experienceSection}

${skillsSection}

${projectsSection}

% Education Section (template)
\\section{Education}
\\textbf{Bachelor of Science in Computer Science} \\hfill \\textit{2018 - 2022} \\\\
\\textit{University of Technology} \\hfill GPA: 3.8/4.0 \\\\

\\vspace{10pt}

% Generated footer
\\begin{center}
\\small\\textit{Resume generated on ${currentDate} from ${platformName} data}
\\end{center}

\\end{document}`;
    };

    const testGithubFunction = async () => {
        const username = userId.trim();

        if (!username) {
            showMessage('Please enter a GitHub username', 'error');
            return;
        }

        showMessage('Testing GitHub API function...', 'success');

        try {
            const startTime = Date.now();
            // Note: fetchGithubProfileData would need to be implemented
            // This is a placeholder for the original function
            const profileData = await fetchProfileData('github', username);
            const duration = Date.now() - startTime;

            console.log('GitHub API Test Result:', profileData);

            showMessage(`✅ GitHub API test successful! (${duration}ms)
      <br>• Name: ${profileData.name}
      <br>• Repositories: ${profileData.projects.length}
      <br>• Skills: ${profileData.skills.length}
      <br>• Method: ${profileData.metadata.directApi ? 'Direct GitHub API' : 'Backend Scraper'}`, 'success');

            setCurrentProfileData(profileData);
            setShowProfileSection(true);

        } catch (error) {
            console.error('GitHub API test failed:', error);
            showMessage(`❌ GitHub API test failed: ${error.message}`, 'error');
        }
    };

    const testLinkedinFunction = async () => {
        const profileId = userId.trim();

        if (!profileId) {
            showMessage('Please enter a LinkedIn profile ID', 'error');
            return;
        }

        showMessage('Testing LinkedIn function...', 'success');

        try {
            const startTime = Date.now();
            const profileData = await fetchProfileData('linkedin', profileId);
            const duration = Date.now() - startTime;

            console.log('LinkedIn Test Result:', profileData);

            showMessage(`✅ LinkedIn function test completed! (${duration}ms)
      <br>• Name: ${profileData.name}
      <br>• Experience: ${profileData.experience.length} entries
      <br>• Skills: ${profileData.skills.length}
      <br>• Method: ${profileData.metadata.fallback ? 'Fallback Profile' : 'Scraped Data'}`, 'success');

            setCurrentProfileData(profileData);
            setShowProfileSection(true);

        } catch (error) {
            console.error('LinkedIn test failed:', error);
            showMessage(`❌ LinkedIn function test failed: ${error.message}`, 'error');
        }
    };

    const generateResume = async () => {
        const identifier = isUrlType() ? profileUrl.trim() : userId.trim();

        if (!identifier) {
            showMessage(isUrlType() ? 'Please enter a valid URL' : 'Please enter a valid username', 'error');
            return;
        }

        setLoading(true);
        setShowProfileSection(false);
        setShowLatexSection(false);
        setShowDownloadSuccess(false);
        clearMessage();

        try {
            const profileData = await fetchProfileData(dataSource, identifier);
            setCurrentProfileData(profileData);
            setShowProfileSection(true);

            const latexContent = generateLatexResume(profileData);
            setCurrentLatexContent(latexContent);
            setShowLatexSection(true);

            showMessage(`Resume generated successfully from ${profileData.metadata ? profileData.metadata.platform : 'profile'} data! 
      <br>📊 Method: ${profileData.metadata && profileData.metadata.directApi ? 'Direct API' :
                profileData.metadata && profileData.metadata.fallback ? 'Fallback Profile' : 'Backend Scraper'}`, 'success');

        } catch (error) {
            console.error('Resume generation error:', error);
            showMessage(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const downloadLatex = () => {
        if (!currentLatexContent) {
            showMessage('No LaTeX content to download', 'error');
            return;
        }

        const blob = new Blob([currentLatexContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentProfileData.name.replace(/\s+/g, '_')}_Resume.tex`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setShowDownloadSuccess(true);
    };

    const downloadPDF = () => {
        if (!currentProfileData) {
            showMessage('No profile data available', 'error');
            return;
        }

        // Note: jsPDF would need to be imported for this to work
        // This is a simplified version of the original PDF generation
        showMessage('PDF generation feature requires jsPDF library to be added to the project', 'error');
    };

    const ProfilePreview = ({ data }) => {
        if (!data) return null;

        const sourceMethod = data.metadata?.directApi ? 'Direct GitHub API' :
            data.metadata?.fallback ? 'Fallback Profile' :
                data.metadata?.platform === 'linkedin' ? 'LinkedIn Scraper' : 'Backend Scraper';

        const sourceColor = data.metadata?.directApi ? '#16a34a' :
            data.metadata?.fallback ? '#ea580c' :
                data.metadata?.platform === 'linkedin' ? '#0066cc' : '#6b7280';

        return (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
                <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-200">
                    {data.avatar && (
                        <img src={data.avatar} alt="Profile" className="w-15 h-15 rounded-full border-2 border-gray-200" />
                    )}
                    <div>
                        <h4 className="text-xl font-semibold text-gray-800 m-0">{data.name}</h4>
                        <p className="text-gray-600 text-sm my-1">{data.location || 'Location not specified'}</p>
                        {data.bio && (
                            <p className="text-gray-600 text-sm italic">
                                {data.bio.substring(0, 120)}{data.bio.length > 120 ? '...' : ''}
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                        <strong>Contact Information:</strong><br />
                        {data.email && <span>📧 {data.email}<br /></span>}
                        {data.phone && <span>📞 {data.phone}<br /></span>}
                        {data.website && (
                            <span>🌐 <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 no-underline">Website</a><br /></span>
                        )}
                    </div>
                    <div>
                        <strong>Data Source:</strong><br />
                        <span>📊 {data.metadata?.platform || 'unknown'}<br /></span>
                        <span>🔧 <span style={{ color: sourceColor, fontWeight: 600 }}>{sourceMethod}</span><br /></span>
                        <span>🕒 {data.metadata ? new Date(data.metadata.scrapedAt).toLocaleString() : 'Unknown'}<br /></span>
                        {data.metadata?.note && <span>ℹ️ {data.metadata.note}<br /></span>}
                    </div>
                </div>

                {data.skills && data.skills.length > 0 && (
                    <div className="mb-5">
                        <strong>Skills ({data.skills.length}):</strong>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {data.skills.slice(0, 15).map((skill, index) => (
                                <span key={index} className="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-xl text-xs font-medium">
                  {skill}
                </span>
                            ))}
                            {data.skills.length > 15 && (
                                <span className="text-gray-600 text-xs">+{data.skills.length - 15} more</span>
                            )}
                        </div>
                    </div>
                )}

                <div>
                    <strong>Experience ({data.experience ? data.experience.length : 0} positions):</strong>
                    <div className="mt-4">
                        {data.experience && data.experience.length > 0 ? (
                            data.experience.map((exp, index) => (
                                <div key={index} className="border-l-3 border-indigo-600 pl-4 mb-4">
                                    <h5 className="text-gray-800 font-semibold m-0">{exp.position} at {exp.company}</h5>
                                    <p className="text-gray-600 text-sm my-1">{exp.duration}</p>
                                    <p className="text-gray-600 text-sm my-1">{exp.responsibilities ? exp.responsibilities.length : 0} responsibilities listed</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-600 italic">No experience data available</p>
                        )}
                    </div>
                </div>

                {data.projects && data.projects.length > 0 && (
                    <div className="mt-5">
                        <strong>Projects ({data.projects.length}):</strong>
                        {data.projects.slice(0, 3).map((project, index) => (
                            <div key={index} className="mt-2.5 p-2.5 bg-gray-50 rounded border border-gray-200">
                                <h6 className="text-gray-800 text-sm font-semibold m-0">
                                    {project.url ? (
                                        <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 no-underline">
                                            {project.name}
                                        </a>
                                    ) : project.name}
                                </h6>
                                <p className="text-gray-600 text-xs my-1">
                                    {project.description ? project.description.substring(0, 100) + '...' : 'No description'}
                                </p>
                                <div className="flex gap-2.5 items-center">
                                    {project.language && (
                                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">{project.language}</span>
                                    )}
                                    {project.stars && (
                                        <span className="text-gray-600 text-xs">⭐ {project.stars}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-400 to-purple-600 p-5">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-10 text-center">
                    <h1 className="text-4xl font-bold mb-2">🎯 AI Resume Generator</h1>
                    <p className="text-lg opacity-90">Generate professional LaTeX resumes from profile data</p>
                </div>

                <div className="p-10">
                    {/* Configuration Section */}
                    <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
                            📡 Data Source Configuration
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            <div>
                                <label className="block font-semibold mb-2 text-gray-700 text-sm">
                                    Profile Scraper API URL:
                                </label>
                                <input
                                    type="url"
                                    value={apiBaseUrl}
                                    onChange={(e) => setApiBaseUrl(e.target.value)}
                                    placeholder="Enter your Cloud Function URL"
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base transition-all focus:outline-none focus:border-indigo-600 focus:ring-0 focus:ring-indigo-600 focus:ring-opacity-10"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold mb-2 text-gray-700 text-sm">
                                    Data Source Type:
                                </label>
                                <select
                                    value={dataSource}
                                    onChange={handleDataSourceChange}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base transition-all focus:outline-none focus:border-indigo-600 focus:ring-0 focus:ring-indigo-600 focus:ring-opacity-10"
                                >
                                    <option value="github">GitHub Profile</option>
                                    <option value="linkedin">LinkedIn Profile</option>
                                    <option value="website">Personal Website</option>
                                    <option value="portfolio">Portfolio Site</option>
                                    <option value="url">Direct URL</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Input Section */}
                    <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
                            👤 Profile Information
                        </h3>

                        {!isUrlType() ? (
                            <div className="mb-5">
                                <label className="block font-semibold mb-2 text-gray-700 text-sm">
                                    {getInputLabel()}
                                </label>
                                <input
                                    type="text"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    placeholder={getInputPlaceholder()}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base transition-all focus:outline-none focus:border-indigo-600 focus:ring-0 focus:ring-indigo-600 focus:ring-opacity-10"
                                />
                            </div>
                        ) : (
                            <div className="mb-5">
                                <label className="block font-semibold mb-2 text-gray-700 text-sm">
                                    {getInputLabel()}
                                </label>
                                <input
                                    type="url"
                                    value={profileUrl}
                                    onChange={(e) => setProfileUrl(e.target.value)}
                                    placeholder={getInputPlaceholder()}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base transition-all focus:outline-none focus:border-indigo-600 focus:ring-0 focus:ring-indigo-600 focus:ring-opacity-10"
                                />
                            </div>
                        )}

                        <div className="flex gap-2.5 justify-center flex-wrap">
                            <button
                                onClick={generateResume}
                                disabled={loading}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none px-7 py-3.5 rounded-lg text-base font-semibold cursor-pointer transition-all inline-flex items-center gap-2 hover:transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                <span>🚀</span> Generate Resume
                            </button>

                            {dataSource === 'github' && (
                                <button
                                    onClick={testGithubFunction}
                                    className="bg-gradient-to-r from-green-600 to-teal-600 text-white border-none px-7 py-3.5 rounded-lg text-base font-semibold cursor-pointer transition-all inline-flex items-center gap-2 hover:transform hover:-translate-y-0.5 hover:shadow-lg"
                                >
                                    <span>🧪</span> Test GitHub API
                                </button>
                            )}

                            {dataSource === 'linkedin' && (
                                <button
                                    onClick={testLinkedinFunction}
                                    className="bg-gradient-to-r from-green-600 to-teal-600 text-white border-none px-7 py-3.5 rounded-lg text-base font-semibold cursor-pointer transition-all inline-flex items-center gap-2 hover:transform hover:-translate-y-0.5 hover:shadow-lg"
                                >
                                    <span>🧪</span> Test LinkedIn Function
                                </button>
                            )}
                        </div>

                        <div className="bg-blue-50 border border-blue-200 text-blue-800 mt-4 p-3 rounded-lg text-sm">
                            <strong>💡 Platform-Specific Functions Available:</strong><br />
                            • <code>fetchGithubProfileData(username)</code> - Direct GitHub API access<br />
                            • <code>fetchLinkedinProfileData(profileId)</code> - LinkedIn with fallback<br />
                            • Test buttons appear when selecting GitHub or LinkedIn platforms
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center py-8 text-gray-600">
                            <div className="border-3 border-gray-200 border-t-indigo-600 rounded-full w-10 h-10 animate-spin mx-auto mb-4"></div>
                            <p>Fetching profile data and generating resume...</p>
                        </div>
                    )}

                    {/* Messages */}
                    {message.text && (
                        <div className={`p-3 rounded-lg mb-5 font-medium ${
                            message.type === 'error'
                                ? 'bg-red-50 border border-red-200 text-red-700'
                                : 'bg-green-50 border border-green-200 text-green-700'
                        }`}>
                            <div dangerouslySetInnerHTML={{ __html: message.text }} />
                        </div>
                    )}

                    {/* Profile Preview */}
                    {showProfileSection && currentProfileData && (
                        <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
                                📋 Fetched Profile Data
                            </h3>
                            <ProfilePreview data={currentProfileData} />
                        </div>
                    )}

                    {/* LaTeX Preview */}
                    {showLatexSection && currentLatexContent && (
                        <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
                                📄 Generated LaTeX Resume
                            </h3>
                            <div className="bg-gray-900 text-gray-100 p-5 rounded-lg font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto my-5 leading-6">
                                <pre>{currentLatexContent}</pre>
                            </div>

                            <div className="flex gap-2.5 justify-center flex-wrap">
                                <button
                                    onClick={downloadPDF}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none px-7 py-3.5 rounded-lg text-base font-semibold cursor-pointer transition-all inline-flex items-center gap-2 hover:transform hover:-translate-y-0.5 hover:shadow-lg"
                                >
                                    <span>📥</span> Download PDF Resume
                                </button>
                                <button
                                    onClick={downloadLatex}
                                    className="bg-gradient-to-r from-green-600 to-teal-600 text-white border-none px-7 py-3.5 rounded-lg text-base font-semibold cursor-pointer transition-all inline-flex items-center gap-2 hover:transform hover:-translate-y-0.5 hover:shadow-lg"
                                >
                                    <span>📝</span> Download LaTeX Source
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {showDownloadSuccess && (
                        <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200 mt-5">
                            <h3 className="text-green-700 mb-2">✅ Resume Generated Successfully!</h3>
                            <p className="text-green-600">Your professional resume has been generated and downloaded.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIResumeGenerator;
