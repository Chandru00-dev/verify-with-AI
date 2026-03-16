# Verify with AI: Truth Analysis Platform

A robust web application designed to leverage Google's Gemini AI for deep content analysis and fact-checking. The platform analyzes various media formats, including YouTube videos, PDF documents, images, and raw text, to evaluate truthfulness, provide evidence-backed scoring, and supply reputable citations.

## Key Features

- **Comprehensive Media Analysis**: Native support for analyzing YouTube video transcripts and metadata, PDF documents, image files, and direct text input.
- **Advanced IP Bypass Mechanism**: Integrated with Jina AI Reader API to reliably scrape web content and bypass restrictive cloud IP bans and CAPTCHAs.
- **AI-Driven Fact-Checking**: Powered by Google Gemini 2.0 Flash Lite via OpenRouter for high-speed, accurate credibility assessments.
- **Quantitative Scoring System**: Delivers a clear breakdown of "Likely True" versus "Likely False" percentages for all analyzed claims.
- **Evidence & Citation Engine**: Automatically generates specific reasoning and provides recommended external sources for manual verification.
- **Multilingual Support**: Supports user-requested analysis outputs in English, Tamil, Hindi, and Telugu.
- **Secure Authentication**: Full OAuth 2.0 integration for Google and Microsoft SSO, alongside traditional secure email/password registration.
- **Persistent Chat History**: Securely stores past verifications in a relational database for authenticated users.
- **Responsive UI/UX**: Features a highly polished, responsive interface with Dark/Light mode toggling, glassmorphism elements, and professional typography.

## Technical Architecture

- **Frontend**: HTML5, Vanilla CSS3, Vanilla JavaScript
- **Backend**: Python 3 (Flask Framework)
- **Production Server**: Gunicorn WSGI HTTP Server
- **Database**: TiDB Serverless (MySQL Compatible, requiring SSL/TLS)
- **AI Integration**: OpenRouter API (Google Gemini models)
- **Scraping Infrastructure**: Jina AI Reader API, BeautifulSoup4
- **Authentication**: Authlib (OAuth 2.0), Werkzeug Security

## Prerequisites

Ensure the following dependencies are installed before setting up the application:

- Python 3.8 or higher
- Git
- Access to a MySQL database (TiDB Serverless recommended)
- OpenRouter API Key
- Google Cloud Console Project (for Google OAuth)
- Microsoft Azure App Registration (for Microsoft OAuth)

## Local Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/verify-with-ai.git
cd verify-with-ai
```

### 2. Configure Virtual Environment

It is highly recommended to use a virtual environment to manage dependencies.

```bash
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Environment Variables Configuration

Create a `.env` file in the root directory. This file must not be committed to version control.

```env
# OpenRouter / Gemini API Configuration
API_KEY="your_openrouter_api_key"
API_URL="https://openrouter.ai/api/v1/chat/completions"
MODEL="google/gemini-2.0-flash-lite-preview-02-05:free"

# Database Configuration (TiDB / MySQL)
DB_HOST="your_mysql_host_address"
DB_USER="your_database_user"
DB_PASSWORD="your_database_password"
DB_PORT="4000"
DB_NAME="your_database_name"

# Flask Application Security
SECRET_KEY="generate_a_secure_random_string_here"

# OAuth 2.0 Credentials (Optional, necessary for SSO)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

MICROSOFT_CLIENT_ID="your_microsoft_client_id"
MICROSOFT_CLIENT_SECRET="your_microsoft_client_secret"
```

### 5. Database Initialization

The application includes an automated script to build the required database schema, including the `users` and `chat_history` tables.

```bash
python init_db.py
```

*Note: The script is pre-configured to handle secure SSL/TLS connections, which is strictly required for TiDB Serverless clusters.*

### 6. Run the Application Locally

Start the local Flask development server. Note that this server is intended for development and testing purposes only.

```bash
python app.py
```

The application will be accessible at `http://localhost:5000`.

## Production Deployment (Render)

This application is configured for production deployment on Render as a Web Service.

1. Create a new Web Service on the Render Dashboard and connect your repository.
2. Set the **Build Command**:
   ```bash
   pip install -r requirements.txt
   ```
3. Set the **Start Command**:
   ```bash
   gunicorn app:app
   ```
4. Map all keys from your local `.env` file into the Render **Environment Variables** interface.
5. Deploy the application. The system securely utilizes `ProxyFix` within the Flask application to ensure OAuth 2.0 HTTPS redirects function correctly behind Render's reverse proxy.

## Security Considerations

- **Password Storage**: Passwords are cryptographically hashed using `werkzeug.security` prior to database insertion.
- **Proxy Handling**: The internal Flask application implements `ProxyFix` to properly process HTTP forwarded headers, ensuring secure token generation.
- **Database Transport**: PyMySQL connections are hardcoded to enforce SSL encryption (`ssl={'ssl': {}}`) to secure credentials and user data in transit to remote databases.

## Contributing

1. Fork the project repository.
2. Create a dedicated feature branch (`git checkout -b feature/new-capability`).
3. Commit your changes logically (`git commit -m 'feat: Add new capability'`).
4. Push to the remote branch (`git push origin feature/new-capability`).
5. Submit a Pull Request for review.
