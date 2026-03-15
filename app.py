from flask import Flask, request, jsonify, send_from_directory, session, redirect, url_for
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from werkzeug.middleware.proxy_fix import ProxyFix
from datetime import datetime, timedelta
import pymysql
import os
import requests
import json
import base64
import tempfile
import traceback
from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi
from bs4 import BeautifulSoup
import re
from authlib.integrations.flask_client import OAuth
import pypdf

# Load environment variables
load_dotenv(override=True)

app = Flask(__name__)
# Crucial for Render: Tells Flask it is behind a proxy so url_for generates https:// links
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

app.secret_key = os.getenv('SECRET_KEY', 'super_secret_key_for_session') # Required for session
CORS(app)

# Configure OpenRouter API
OPENROUTER_API_KEY = os.getenv('API_KEY')
OPENROUTER_API_URL = os.getenv('API_URL')
MODEL_NAME = os.getenv('MODEL')
print(f"[INFO] Using OpenRouter with model: {MODEL_NAME}")

# --- OAuth Configuration ---
oauth = OAuth(app)

# Google OAuth
google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    access_token_url='https://oauth2.googleapis.com/token',
    access_token_params=None,
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    authorize_params=None,
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    userinfo_endpoint='https://openidconnect.googleapis.com/v1/userinfo',
    client_kwargs={'scope': 'openid email profile'},
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration'
)

# Microsoft OAuth
microsoft = oauth.register(
    name='microsoft',
    client_id=os.getenv('MICROSOFT_CLIENT_ID'),
    client_secret=os.getenv('MICROSOFT_CLIENT_SECRET'),
    access_token_url='https://login.microsoftonline.com/common/oauth2/v2.0/token',
    access_token_params=None,
    authorize_url='https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    authorize_params=None,
    api_base_url='https://graph.microsoft.com/v1.0/',
    userinfo_endpoint='https://graph.microsoft.com/v1.0/me',
    client_kwargs={'scope': 'User.Read'}
)

# Database configuration
db_pass = os.getenv('DB_PASSWORD')
db_host = os.getenv('DB_HOST', 'localhost')
db_port = int(os.getenv('DB_PORT', 3306))
db_user = os.getenv('DB_USER', 'root')
db_name = os.getenv('DB_NAME', 'verify_ai')
print(f"[INFO] DB Password Loaded: {'Yes' if db_pass else 'No'}")

DB_CONFIG = {
    'host': db_host,
    'port': db_port,
    'user': db_user,
    'password': db_pass or '',  # Validates if None, defaults to empty string if needed
    'database': db_name,
    'ssl': {'ssl': {}}
}

# File upload configuration
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'avi', 'mov', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db_connection():
    """Create a database connection"""
    try:
        connection = pymysql.connect(**DB_CONFIG)
        return connection
    except Exception as e:
        print(f"Database connection error: {e}")
        # Print full traceback for debugging
        traceback.print_exc()
        return None

def get_youtube_content(url):
    """Extract metadata and transcript from YouTube video"""
    content_parts = []
    
    try:
        # 1. Metadata Extraction (Title and Description)
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        try:
            # Handle youtu.be vs youtube.com
            full_url = url
            if 'youtu.be/' in url:
                video_id = url.split('/')[-1].split('?')[0]
                full_url = f"https://www.youtube.com/watch?v={video_id}"
            
            response = requests.get(full_url, headers=headers, timeout=10)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                title = soup.title.string if soup.title else "Unknown Title"
                description_meta = soup.find('meta', {'name': 'description'})
                description = description_meta['content'] if description_meta else "No description available"
                
                content_parts.append(f"VIDEO TITLE: {title}")
                content_parts.append(f"VIDEO DESCRIPTION: {description}")
                print(f"[INFO] Scraped metadata: {title[:50]}...")
        except Exception as e:
            print(f"[WARNING] Metadata scraping failed: {e}")

        # 2. Transcript Extraction
        video_id_match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', url)
        if video_id_match:
            video_id = video_id_match.group(1)
            try:
                # Get available transcripts
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                
                # Try English (manual then auto), otherwise get the first available
                try:
                    transcript = transcript_list.find_transcript(['en'])
                except:
                    # If English not found, find the first available transcript
                    transcript = next(iter(transcript_list))
                
                transcript_data = transcript.fetch()
                transcript_text = " ".join([item['text'] for item in transcript_data])
                content_parts.append(f"VIDEO TRANSCRIPT: {transcript_text}")
                print(f"[INFO] Successfully fetched transcript ({transcript.language})")
            except Exception as e:
                print(f"[WARNING] Could not get transcript: {e}")
        
        if not content_parts:
            return None
            
        return "\n\n".join(content_parts)
            
    except Exception as e:
        print(f"[ERROR] YouTube extraction failed: {e}")
        return None

# ========== FRONTEND ROUTES ==========

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# ========== API ROUTES ==========

@app.route('/api/signup', methods=['POST'])
def signup():
    """Handle user registration"""
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        
        if not name or not email or not password:
            return jsonify({'error': 'All fields are required'}), 400
        
        # Hash password
        hashed_password = generate_password_hash(password)
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Check if email already exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Email already registered'}), 400
        
        # Insert new user
        cursor.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
            (name, email, hashed_password)
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Account created successfully'}), 200
        
    except Exception as e:
        print(f"Signup error: {e}")
        return jsonify({'error': 'Server error'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """Handle user login"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SELECT id, password FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user or not check_password_hash(user['password'], password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generate token (simplified - in production use JWT)
        token = f"token_{user['id']}_{datetime.now().timestamp()}"
        
        return jsonify({
            'token': token,
            'user_id': user['id'],
            'user_name': user.get('name', 'User'),
            'profile_pic': user.get('profile_pic'),
            'message': 'Login successful'
        }), 200
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Server error'}), 500

@app.route('/api/login/google')
def login_google():
    redirect_uri = url_for('authorize_google', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/api/callback/google')
def authorize_google():
    try:
        token = google.authorize_access_token()
        user_info = google.get('userinfo').json()
        
        email = user_info['email']
        name = user_info['name']
        google_id = user_info['id']
        picture = user_info.get('picture', '')

        return handle_social_login(email, name, 'google', google_id, picture)
    except Exception as e:
        print(f"Google Auth Error: {e}")
        base_url = request.host_url.rstrip('/')
        return redirect(f"{base_url}/login.html?error=Google+Auth+Failed")

@app.route('/api/login/microsoft')
def login_microsoft():
    redirect_uri = url_for('authorize_microsoft', _external=True)
    return microsoft.authorize_redirect(redirect_uri)

@app.route('/api/callback/microsoft')
def authorize_microsoft():
    try:
        token = microsoft.authorize_access_token()
        resp = microsoft.get('me')
        user_info = resp.json()
        
        email = user_info.get('mail') or user_info.get('userPrincipalName')
        name = user_info.get('displayName')
        ms_id = user_info.get('id')
        
        return handle_social_login(email, name, 'microsoft', ms_id, None)
    except Exception as e:
        print(f"Microsoft Auth Error: {e}")
        base_url = request.host_url.rstrip('/')
        return redirect(f"{base_url}/login.html?error=Microsoft+Auth+Failed")

def handle_social_login(email, name, provider, provider_id, profile_pic):
    conn = get_db_connection()
    if not conn:
        base_url = request.host_url.rstrip('/')
        return redirect(f"{base_url}/login.html?error=Database+Error")
    
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # Check if user exists
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if user:
            # Update existing user with provider info if not set
            if not user.get('provider_id'):
                cursor.execute(
                    "UPDATE users SET auth_provider=%s, provider_id=%s, profile_pic=COALESCE(%s, profile_pic) WHERE id=%s",
                    (provider, provider_id, profile_pic, user['id'])
                )
                conn.commit()
            user_id = user['id']
            user_name = user['name']
        else:
            # Create new user
            cursor.execute(
                "INSERT INTO users (name, email, password, auth_provider, provider_id, profile_pic) VALUES (%s, %s, NULL, %s, %s, %s)",
                (name, email, provider, provider_id, profile_pic)
            )
            conn.commit()
            user_id = cursor.lastrowid
            user_name = name
            
        cursor.close()
        conn.close()
        
        # Generate token
        token = f"token_{user_id}_{datetime.now().timestamp()}"
        
        # Redirect to frontend with token
        base_url = request.host_url.rstrip('/')
        return redirect(f"{base_url}/main.html?token={token}&user_id={user_id}&name={user_name}")

    except Exception as e:
        print(f"Social Login DB Error: {e}")
        base_url = request.host_url.rstrip('/')
        return redirect(f"{base_url}/login.html?error=Login+Process+Failed")



@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Analyze content for truthfulness using OpenRouter API"""
    try:
        input_type = request.form.get('input_type')
        user_id = request.form.get('user_id')
        input_content = request.form.get('input_content', '')
        preferred_language = request.form.get('preferred_language', None)
        
        # NEW: Check for explicit language requests in the text input
        if input_content:
            lower_input = input_content.lower()
            languages = {
                'english': 'English',
                'tamil': 'Tamil',
                'hindi': 'Hindi',
                'telugu': 'Telugu'
            }
            for lang_key, lang_name in languages.items():
                if f"in {lang_key}" in lower_input or f"by {lang_key}" in lower_input or f" {lang_key} " in f" {lower_input} ":
                    preferred_language = lang_name
                    print(f"[DEBUG] Explicit language request detected: {lang_name}")
                    break

        print(f"[DEBUG] Received request - Type: {input_type}, Content: {input_content[:50] if input_content else 'None'}")
        
        # Handle file upload
        file_content_path = None
        file_base64 = None
        if 'file' in request.files:
            file = request.files['file']
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file_ext = filename.rsplit('.', 1)[1].lower()
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(filepath)
                print(f"[DEBUG] File saved to: {filepath}")
                
                # Encode as base64 for API
                with open(filepath, 'rb') as f:
                    file_bytes = f.read()
                    file_base64 = base64.b64encode(file_bytes).decode('utf-8')
                    file_content_path = filepath

                # Extract text from PDF
                if file_ext == 'pdf':
                    try:
                        reader = pypdf.PdfReader(filepath)
                        pdf_text = ""
                        for page in reader.pages:
                            pdf_text += page.extract_text() + "\n"
                        # Limit text to avoid token overflow
                        input_content = f"{input_content}\n\n[PDF CONTENT]:\n{pdf_text[:10000]}"
                        print(f"[DEBUG] Extracted {len(pdf_text)} chars from PDF")
                    except Exception as e:
                        print(f"[ERROR] PDF extraction failed: {e}")
                
                print(f"[DEBUG] File encoded to base64 successfully")
        
        # Prepare prompt
        content_text = ""
        prompt_prefix = ""
        
        if input_type == 'link':
            # NEW: Extract content from YouTube link (Metadata + Transcript)
            yt_content = get_youtube_content(input_content)
            if yt_content:
                print(f"[INFO] Successfully extracted content from YouTube")
                content_text = f"YouTube video content: {yt_content[:20000]}" # Increased limit to 20k
                prompt_prefix = f"Analyze this YouTube video using the provided metadata and transcript: {input_content}\n\nCONTENT:\n{content_text}\n\n"
            else:
                content_text = f"YouTube video: {input_content}"
                prompt_prefix = f"Analyze this YouTube video link: {input_content}\n(Note: Content could not be extracted, please analyze based on your knowledge of this URL if possible)\n\n"
        elif input_type == 'text' or (input_type == 'pdf' and input_content):
            content_text = input_content
            prompt_prefix = f"Analyze this content: {input_content}\n\n"
        elif input_type in ['pdf', 'image', 'video']:
            if file_base64 or input_content:
                content_text = input_content if input_content else f"Uploaded {input_type}"
                prompt_prefix = f"Analyze the content in this uploaded {input_type} file and any accompanying text.\n\n"
            else:
                return jsonify({'error': 'File upload failed.'}), 400
        else:
            return jsonify({'error': 'No valid input provided'}), 400
        
        language_instruction = ""
        if preferred_language:
            language_instruction = f"CRITICAL: You MUST generate the entire response in {preferred_language}. This is an explicit user requirement. "
        
        prompt = f"""{prompt_prefix}
{language_instruction}

Your tasks:
1. First, detect the language of the content. If the user explicitly requested a language in their prompt, prioritize that for the response.
2. Provide a detailed text summary/description of the content.
3. Analyze the content for factual accuracy and truthfulness.
4. Provide:
   - Percentage of truthful content (0-100)
   - Percentage of false/misleading content (0-100)
   - Detailed reasons for truthful parts with specific evidence and sources
   - Detailed reasons for false parts with specific evidence and sources
   - If there is false content, recommend 2-3 alternative truthful sources

Format your response as JSON with this structure:
{{
    "detected_language": "language name",
    "language_prompt_needed": true/false,
    "summary": "detailed content summary",
    "truthful_percent": number,
    "false_percent": number,
    "reasons_true": ["reason 1", "reason 2", ...],
    "evidence_true": ["source 1", "source 2", ...],
    "reasons_false": ["reason 1", "reason 2", ...],
    "evidence_false": ["source 1", "source 2", ...],
    "recommendations": ["recommendation 1", "recommendation 2", ...]
}}
"""
        
        # API Headers
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": request.host_url.rstrip('/'),
            "X-Title": "Verify with AI"
        }
        
        # Build messages for OpenRouter
        if file_base64 and input_type == 'image':
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{file_base64}"}
                        }
                    ]
                }
            ]
        else:
            # Note: For PDF/Video OpenRouter models might need specific handling or text extraction
            # Here we wrap the prompt. 
            full_prompt = prompt
            if file_base64 and input_type in ['pdf', 'video']:
                full_prompt += f"\n\nNote: A {input_type} file was uploaded. If you can process its binary or text contents from context, please do so."
            
            messages = [{"role": "user", "content": full_prompt}]
        
        payload = {
            "model": MODEL_NAME,
            "messages": messages,
            "temperature": 0.3
        }
        
        print(f"[DEBUG] Sending request to OpenRouter...")
        api_response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload)
        
        # Cleanup file
        if file_content_path:
            try:
                os.remove(file_content_path)
            except:
                pass
        
        if api_response.status_code != 200:
            error_data = api_response.text
            print(f"[ERROR] OpenRouter API fail: {api_response.status_code}")
            print(f"[ERROR] Response body: {error_data}")
            
            # Try to extract a specific error message if available
            try:
                error_json = api_response.json()
                if 'error' in error_json and 'message' in error_json['error']:
                    return jsonify({'error': f"API Error: {error_json['error']['message']}"}), 500
            except:
                pass
                
            return jsonify({'error': f'API Error ({api_response.status_code})'}), 500
        
        response_json = api_response.json()
        response_text = response_json['choices'][0]['message']['content']
        
        # Parse JSON from response
        try:
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                analysis_data = json.loads(response_text[json_start:json_end])
            else:
                raise ValueError("JSON not found")
        except:
            analysis_data = {
                "detected_language": "English",
                "language_prompt_needed": False,
                "summary": response_text[:500],
                "truthful_percent": 50,
                "false_percent": 50,
                "reasons_true": ["Analysis delivered as text"],
                "evidence_true": [],
                "reasons_false": [],
                "evidence_false": [],
                "recommendations": []
            }
        
        if not preferred_language and analysis_data.get('detected_language', 'English').lower() != 'english':
            analysis_data['language_prompt_needed'] = True
        else:
            analysis_data['language_prompt_needed'] = False
        
        # Store History
        if user_id and user_id != 'guest':
            try:
                conn = get_db_connection()
                if conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "INSERT INTO chat_history (user_id, timestamp, input_type, input_content, response) VALUES (%s, %s, %s, %s, %s)",
                        (user_id, datetime.now(), input_type, content_text, json.dumps(analysis_data))
                    )
                    conn.commit()
                    cursor.close()
                    conn.close()
            except Exception as e:
                print(f"History error: {e}")
        
        return jsonify(analysis_data), 200
        
    except Exception as e:
        print(f"Crash: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        user_id = request.args.get('user_id')
        if not user_id or user_id == 'guest':
            return jsonify({'history': []}), 200
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'DB fail'}), 500
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SELECT id, timestamp, input_type, input_content, response FROM chat_history WHERE user_id = %s ORDER BY timestamp DESC LIMIT 50", (user_id,))
        history = cursor.fetchall()
        for item in history:
            item['timestamp'] = item['timestamp'].isoformat()
        cursor.close()
        conn.close()
        return jsonify({'history': history}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/search', methods=['GET'])
def search_history():
    try:
        user_id = request.args.get('user_id')
        query = request.args.get('q', '')
        if not user_id or user_id == 'guest':
            return jsonify({'history': []}), 200
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'DB fail'}), 500
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SELECT id, timestamp, input_type, input_content, response FROM chat_history WHERE user_id = %s AND input_content LIKE %s ORDER BY timestamp DESC LIMIT 50", (user_id, f'%{query}%'))
        history = cursor.fetchall()
        for item in history:
            item['timestamp'] = item['timestamp'].isoformat()
        cursor.close()
        conn.close()
        return jsonify({'history': history}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/new_chat', methods=['POST'])
def new_chat():
    return jsonify({'message': 'OK'}), 200

@app.route('/api/user/profile', methods=['GET'])
def get_user_profile():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute("SELECT id, name, email, profile_pic, phone FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify(user), 200
    except Exception as e:
        print(f"Profile error: {e}")
        return jsonify({'error': 'Server error'}), 500

@app.route('/api/user/profile/update', methods=['POST'])
def update_user_profile():
    try:
        data = request.json
        user_id = data.get('user_id')
        name = data.get('name')
        email = data.get('email')
        profile_pic = data.get('profile_pic')  # Base64 string
        phone = data.get('phone')
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Build update query
        update_fields = []
        params = []
        
        if name:
            update_fields.append("name = %s")
            params.append(name)
        if email:
            update_fields.append("email = %s")
            params.append(email)
        if profile_pic:
            update_fields.append("profile_pic = %s")
            params.append(profile_pic)
        if phone is not None and phone != '':
            update_fields.append("phone = %s")
            params.append(phone)
            
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
            
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"
        
        cursor.execute(query, tuple(params))
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Profile updated successfully'}), 200
    except Exception as e:
        print(f"Update profile error: {e}")
        return jsonify({'error': 'Server error'}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
