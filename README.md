# Verify with AI: Truth Analysis Platform

A powerful web application that uses Google's Gemini AI to analyze content (YouTube videos, PDFs, images, text) for truthfulness. It provides detailed fact-checking, percentage breakdowns of accuracy, evidence citations, and recommendations for truthful alternatives.

## Features

- Content Analysis: Analyze YouTube videos (transcript + metadata), PDF documents, images, and raw text.
- AI Fact-Checking: Uses Google Gemini to verify claims against known facts.
- Scoring System: Returns a "Truthful %" vs "False/Misleading %" score.
- Evidence & Sources: Provides specific reasons and citations for its analysis.
- Language Support: Detects content language and allows users to request responses in specific languages (English, Tamil, Hindi, Telugu).
- Social Authentication: Login with Google and Microsoft accounts.
- Chat History: Saves past analyses for registered users.
- Dark/Light Mode: User-friendly interface with theme toggling.

## Tech Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript (Clean, responsive UI).
- Backend: Python (Flask).
- Database: MySQL (Stores users and chat history).
- AI Model: Google Gemini 2.0 Flash Lite (via OpenRouter).
- APIs: YouTube Transcript API, Authlib (OAuth).

--------------------------------------------------------------------------------

## Installation & Setup

Follow these steps to set up the project locally.

### 1. Prerequisites
Ensure you have the following installed:
- Python 3.8+
- MySQL Server (via XAMPP, MySQL Workbench, or standalone)
- Git

### 2. Clone the Repository
    git clone https://github.com/your-username/verify-with-ai.git
    cd verify-with-ai

### 3. Set Up Virtual Environment (Recommended)
    python -m venv venv
    # Windows:
    venv\Scripts\activate
    # Mac/Linux:
    source venv/bin/activate

### 4. Install Dependencies
    pip install -r requirements.txt

### 5. Set Up Environment Variables
Create a .env file in the root directory and add the following keys.
Important: Do NOT share this file.

    # OpenRouter / Gemini API
    API_KEY="your_openrouter_api_key"
    API_URL="https://openrouter.ai/api/v1/chat/completions"
    MODEL="google/gemini-2.0-flash-lite-preview-02-05:free"

    # Database Configuration
    DB_PASSWORD="your_mysql_root_password"

    # Flask Security
    SECRET_KEY="your_random_secret_string"

    # Social Authentication (Optional - for Login)
    GOOGLE_CLIENT_ID="your_google_client_id"
    GOOGLE_CLIENT_SECRET="your_google_client_secret"

    MICROSOFT_CLIENT_ID="your_microsoft_client_id"
    MICROSOFT_CLIENT_SECRET="your_microsoft_client_secret"

### 6. Database Initialization
You can set up the database automatically using the included script (if available) or manually via MySQL shell.

To set up manually:
    CREATE DATABASE verify_ai;
    USE verify_ai;
    
    CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(120) UNIQUE NOT NULL,
        password VARCHAR(255) NULL,
        auth_provider VARCHAR(20) DEFAULT 'email',
        provider_id VARCHAR(255),
        profile_pic TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE INDEX idx_provider (provider_id, auth_provider)
    );

    CREATE TABLE chat_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50),
        input_type VARCHAR(20),
        input_content TEXT,
        response TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

### 7. Run the Application
Start the Flask backend:
    python app.py

The server will start at http://localhost:5000.

--------------------------------------------------------------------------------

## Usage Guide

1. Open the App: Go to http://localhost:5000 in your browser.
2. Login/Signup:
   - Create an account with Email/Password.
   - OR Login with Google or Microsoft.
3. Analyze Content:
   - YouTube: Paste a video URL. The app fetches the transcript and analyzes it.
   - PDF/Image: Upload a file to scan its text/visuals.
   - Text: Paste raw text to check statements.
4. View Results: Read the summary, truth score, and detailed breakdown.
5. History: Access your past verification requests from the sidebar.

--------------------------------------------------------------------------------

## Security Notes

- Passwords: User passwords are hashed using werkzeug.security before being stored.
- Environment Variables: Sensitive keys (API secrets, DB passwords) are loaded from .env and are not hardcoded.
- OAuth: Social login uses secure OAuth 2.0 flows via Authlib.

## Contributing

1. Fork the repository.
2. Create a feature branch (git checkout -b feature-name).
3. Commit your changes (git commit -m "Add new feature").
4. Push to the branch (git push origin feature-name).
5. Open a Pull Request.

--------------------------------------------------------------------------------

Developed for the "Verify with AI" Project.
