# Verify with AI

A web application that analyzes YouTube videos, PDFs, and images for truthfulness using Google's Gemini AI. The application provides detailed analysis with percentages of truthful and false content, along with evidence from researched sources and recommendations for alternative truthful content.

## Features

- **Content Analysis**: Analyze YouTube links, uploaded videos, PDFs, and images
- **Truth Verification**: Get percentage breakdown of truthful vs. false content
- **Evidence-Based**: Receive detailed reasons and evidence from reputable sources
- **Recommendations**: Get suggestions for truthful alternative content
- **Multilingual Support**: Detect content language and choose response language
- **Chat Interface**: Intuitive chat-based UI for easy interaction
- **History Tracking**: Save and search through past analyses
- **Dark Theme**: Toggle between light and dark modes
- **User Authentication**: Secure login/signup with password hashing

## Tech Stack

### Frontend
- HTML5
- CSS3 (Responsive design with flexbox)
- Vanilla JavaScript
- Font Awesome icons

### Backend
- Python 3.x
- Flask (Web framework)
- MySQL (Database)
- Google Gemini AI (Content analysis)
- Werkzeug (Password hashing)

## Prerequisites

Before running the application, ensure you have:

1. **Python 3.8+** installed
2. **MySQL Server** installed and running
3. **Web browser** (Chrome, Firefox, Edge, etc.)

## Installation & Setup

### 1. Database Setup

First, set up the MySQL database:

1. Open MySQL command line or MySQL Workbench
2. Run the database schema:

```bash
mysql -u root -p < database.sql
```

Or manually execute the SQL commands in `database.sql`:

```sql
CREATE DATABASE verify_ai;
USE verify_ai;
-- (copy and paste the rest of the SQL from database.sql)
```

### 2. Backend Setup

1. Install Python dependencies:

```bash
pip install -r requirements.txt
```

2. Configure database connection (if needed):

Open `app.py` and modify the `DB_CONFIG` section if your MySQL credentials are different:

```python
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',  # Update with your MySQL password
    'database': 'verify_ai'
}
```

3. Start the Flask server:

```bash
python app.py
```

The server will start on `http://localhost:5000`

### 3. Frontend Setup

1. Open `index.html` in your web browser, or
2. Use a local web server (recommended):

```bash
# Using Python's built-in server
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Usage

### 1. Getting Started

1. Open the application in your browser
2. Click "Get Started" on the welcome page
3. Sign up for a new account or login

### 2. Analyzing Content

1. After logging in, you'll see the main chat interface
2. You can analyze content in several ways:
   - **YouTube Links**: Paste a YouTube URL in the input box
   - **Upload Files**: Click the paperclip icon to upload PDFs, images, or videos
   - **Text Input**: Type or paste text directly

3. Click send and wait for the AI analysis

### 3. Understanding Results

The AI will provide:
- **Content Summary**: A description of what the content is about
- **Truthful Percentage**: How much of the content is factually accurate
- **False Percentage**: How much of the content is misleading or false
- **Reasons & Evidence**: Detailed explanations with sources
- **Recommendations**: Alternative truthful content if applicable

### 4. Additional Features

- **New Chat**: Click the hamburger menu → "New Chat" to start fresh
- **Chat History**: View and search your past analyses
- **Dark Theme**: Toggle dark mode in Settings
- **Language Preference**: Choose your preferred response language for non-English content

## Project Structure

```
verify with AI/
│
├── index.html          # Welcome/landing page
├── login.html          # Login and signup page
├── main.html           # Main chat interface
├── style.css           # All styling and themes
├── script.js           # Frontend JavaScript logic
│
├── app.py              # Flask backend server
├── database.sql        # MySQL database schema
├── requirements.txt    # Python dependencies
│
└── README.md           # This file
```

## API Endpoints

The backend provides the following API endpoints:

- `POST /api/signup` - Create new user account
- `POST /api/login` - Authenticate user
- `POST /api/analyze` - Analyze content with Gemini AI
- `GET /api/history` - Get user's chat history
- `GET /api/history/search` - Search chat history
- `POST /api/new_chat` - Start new chat session
- `GET /api/health` - Server health check

## Configuration

### Gemini API Key

The Gemini API key is already configured in `app.py`:

```python
GEMINI_API_KEY = "-------------------"
```

If you need to use a different key, update this value.

### Supported File Types

- **Videos**: .mp4, .avi, .mov, .webm
- **Images**: .jpg, .jpeg, .png, .gif, .webp
- **Documents**: .pdf

## Troubleshooting

### Backend Issues

**Database Connection Error**:
- Ensure MySQL is running
- Check database credentials in `app.py`
- Verify the `verify_ai` database exists

**Module Import Errors**:
- Run `pip install -r requirements.txt` again
- Ensure you're using Python 3.8+

**Gemini API Errors**:
- Check internet connection
- Verify API key is valid
- Ensure you haven't exceeded API quota

### Frontend Issues

**Cannot connect to backend**:
- Ensure Flask server is running on port 5000
- Check browser console for CORS errors
- Verify API_URL in `script.js` matches your backend URL

**File upload not working**:
- Check file size (very large files may timeout)
- Ensure file type is supported
- Check browser console for errors

## Security Notes

- Passwords are hashed using Werkzeug's `generate_password_hash`
- Session tokens are simplified for demonstration (use JWT in production)
- CORS is enabled for local development (configure properly for production)
- File uploads are temporarily stored and deleted after processing

## Future Enhancements

Potential improvements for production:
- Implement proper JWT authentication
- Add rate limiting for API endpoints
- Implement proper session management
- Add email verification for signup
- Improve error handling and logging
- Add unit and integration tests
- Deploy to cloud hosting

## License

This project is for educational purposes.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console and server logs
3. Ensure all dependencies are installed correctly
