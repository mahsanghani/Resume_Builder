# Resume Builder

A modern, user-friendly web application for creating professional resumes with customizable templates and real-time editing capabilities.

## 🌟 Features

- **Interactive Resume Builder**: Create professional resumes with an intuitive, step-by-step interface
- **Multiple Templates**: Choose from various professionally designed resume templates
- **Real-time Preview**: See your resume update instantly as you make changes
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Export Options**: Download your resume as PDF or print directly
- **Data Persistence**: Save your progress and return to edit later
- **Professional Formatting**: Automatic formatting ensures your resume looks polished
- **Customizable Sections**: Add, remove, or reorder resume sections as needed

## 🚀 Demo

[Live Demo](https://mahsanghani.github.io/Resume_Builder/)

## 📸 Screenshots

<!-- Add screenshots of your application -->
```
[Main Interface] [Template Selection] [Resume Preview]
```

## 🛠️ Technologies Used

### Frontend
- **Framework**: React.js / Vue.js
- **Styling**: CSS3, responsive design
- **Build Tools**: Webpack, npm/yarn
- **Server**: Nginx (for production)

### Backend
- **Runtime**: Node.js
- **Cloud Functions**: Firebase Functions
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Testing**: Jest

### DevOps & Deployment
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Cloud Platform**: Firebase
- **Version Control**: Git & GitHub

## 📋 Getting Started

## 📋 Getting Started

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Docker** (optional, for containerized deployment)
- **Firebase CLI** (for backend deployment)
- **Git** (for cloning the repository)

### Installation

#### Option 1: Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/mahsanghani/Resume_Builder.git
   cd Resume_Builder
   ```

2. **Set up the Backend**
   ```bash
   cd backend/functions
   npm install
   
   # Copy environment variables
   cp .env.example .env
   # Edit .env with your Firebase configuration
   ```

3. **Set up the Frontend**
   ```bash
   cd ../../frontend
   npm install
   
   # Copy environment variables
   cp .env.example .env
   # Edit .env with your API endpoints
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend (Firebase Functions)
   cd backend/functions
   npm run serve
   
   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

#### Option 2: Docker Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/mahsanghani/Resume_Builder.git
   cd Resume_Builder
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
    - Frontend: http://localhost:3000
    - Backend: http://localhost:5001

### Deployment

Run the deployment script:
```bash
./deploy.sh
```

Or deploy using GitHub Actions by pushing to the main branch.

## 📖 Usage

1. **Start Building**: Open the application and click "Create New Resume"
2. **Choose Template**: Select from available professional templates
3. **Fill Information**: Complete each section with your details:
    - Personal Information
    - Professional Summary
    - Work Experience
    - Education
    - Skills
    - Additional Sections (Projects, Certifications, etc.)
4. **Preview**: Review your resume in real-time
5. **Download**: Export as PDF or print your completed resume

## 📁 Project Structure

```
Resume_Builder/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment workflow
├── backend/
│   ├── functions/
│   │   ├── test/
│   │   │   ├── index.test.js   # Backend tests
│   │   │   └── test.js         # Test utilities
│   │   ├── .env.example        # Environment variables template
│   │   ├── .eslintrc.js        # ESLint configuration
│   │   ├── index.js            # Firebase Functions entry point
│   │   └── node_modules/       # Backend dependencies
│   ├── .firebaserc            # Firebase project configuration
│   ├── Dockerfile             # Backend Docker configuration
│   ├── firebase.json          # Firebase settings
│   ├── package.json           # Backend dependencies
│   └── package-lock.json      # Backend dependency lock file
├── configs/                   # Configuration files
├── docs/                      # Project documentation
├── frontend/
│   ├── node_modules/          # Frontend dependencies
│   ├── public/                # Static assets
│   ├── src/                   # React/Vue source code
│   ├── .env                   # Frontend environment variables
│   ├── .gitignore             # Frontend gitignore
│   ├── Dockerfile             # Frontend Docker configuration
│   ├── nginx.conf             # Nginx server configuration
│   ├── package.json           # Frontend dependencies
│   └── package-lock.json      # Frontend dependency lock file
├── .gitignore                 # Root gitignore
├── deploy.sh                  # Deployment script
├── docker-compose.yml         # Multi-container Docker setup
├── package.json               # Root package configuration
└── README.md                  # Project documentation
```

## 🎨 Available Templates

- **Classic**: Traditional format suitable for conservative industries
- **Modern**: Contemporary design with accent colors
- **Minimal**: Clean, simple layout focusing on content
- **Creative**: Unique design for creative professionals

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style and conventions
- Run tests before submitting PRs:
  ```bash
  # Backend tests
  cd backend/functions
  npm test
  
  # Frontend tests (if available)
  cd frontend
  npm test
  ```
- Update documentation as needed
- Ensure responsive design compatibility
- Test Docker builds locally before pushing

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature request? Please open an issue:

1. Go to the [Issues](https://github.com/mahsanghani/Resume_Builder/issues) page
2. Click "New Issue"
3. Choose the appropriate template
4. Provide detailed information

## 📝 Roadmap

- [ ] Enhanced user authentication (Google, GitHub OAuth)
- [ ] Real-time collaborative editing
- [ ] Advanced template customization
- [ ] Resume analytics and performance insights
- [ ] Integration with job boards (LinkedIn, Indeed)
- [ ] AI-powered content suggestions
- [ ] Multi-language support
- [ ] Mobile app development
- [ ] Resume version control and history
- [ ] Team/organization accounts

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Mahsan Ghani**
- GitHub: [@mahsanghani](https://github.com/mahsanghani)
- LinkedIn: [Your LinkedIn Profile](https://linkedin.com/in/your-profile)

## 🙏 Acknowledgments

- Design inspiration from various modern resume builders
- Icons provided by [FontAwesome](https://fontawesome.com/)
- Fonts from [Google Fonts](https://fonts.google.com/)
- Community contributors and testers

## 📞 Support

If you found this project helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 🤝 Contributing to the code

---

**Happy Resume Building!** 🎉

Create professional resumes that stand out and help you land your dream job.
