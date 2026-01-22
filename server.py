from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import google.generativeai as genai
import os
import markdown
from dotenv import load_dotenv
import sqlite3
import datetime
import time
import logging
from werkzeug.utils import secure_filename
from google.api_core import exceptions
import PIL.Image

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    filename='application.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found in environment variables")
else:
    genai.configure(api_key=api_key)

SYSTEM_PROMPT = """You are Harsha's AI, a helpful and knowledgeable AI assistant. 
Your goal is to assist users with any questions or tasks they may have, across a wide range of topics.
You are capable of analyzing images and PDF documents that the user uploads.
Be polite, concise, and helpful."""

AVAILABLE_MODELS = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp'
]

from flask_cors import CORS

app = Flask(__name__, 
            static_folder='frontend/dist/assets',
            template_folder='frontend/dist')

# Configure headers for CORS
CORS(app)

DB_NAME = "chat.db"
# Vercel uses a read-only filesystem, /tmp is the only writable directory
UPLOAD_FOLDER = '/tmp' if os.environ.get('VERCEL') or os.environ.get('VERCEL_ENV') else 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def init_db():
    # Note: SQLite on Vercel is temporary and will reset on every deploy/restart
    db_path = os.path.join(UPLOAD_FOLDER, DB_NAME) if os.environ.get('VERCEL') else DB_NAME
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS messages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  session_id TEXT NOT NULL,
                  role TEXT NOT NULL,
                  content TEXT NOT NULL,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    
    # Check for image_path column
    c.execute("PRAGMA table_info(messages)")
    columns = [column[1] for column in c.fetchall()]
    if 'image_path' not in columns:
        c.execute("ALTER TABLE messages ADD COLUMN image_path TEXT")
        
    conn.commit()
    conn.close()

# Use the correct DB path everywhere
def get_db_connection():
    db_path = os.path.join(UPLOAD_FOLDER, DB_NAME) if os.environ.get('VERCEL') else DB_NAME
    return sqlite3.connect(db_path)

# Initialize DB on startup
init_db()

@app.route('/')
def home():
    return send_from_directory('frontend/dist', 'index.html')

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

def get_chat_history(session_id):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT role, content, image_path FROM messages WHERE session_id = ? ORDER BY id ASC", (session_id,))
    rows = c.fetchall()
    conn.close()
    
    history = []
    # No need to manually add system prompt to history anymore as we use system_instruction
    
    for role, content, image_path in rows:
        api_role = "model" if role == "assistant" else "user"
        parts = [content]
        
        if image_path and os.path.exists(image_path) and api_role == 'user':
             try:
                 if any(image_path.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp']):
                     img = PIL.Image.open(image_path)
                     parts.append(img)
                 elif image_path.lower().endswith('.pdf'):
                     parts.append(f"[File attached: {os.path.basename(image_path)}]")
             except Exception as e:
                 print(f"Could not load file for history: {e}")

        history.append({"role": api_role, "parts": parts})
        
    return history

def generate_with_fallback(session_id, user_message, history, file_path=None):
    last_error = None
    
    for model_name in AVAILABLE_MODELS:
        try:
            print(f"Trying model: {model_name}...")
            # Use SYSTEM_PROMPT as a proper system instruction
            model = genai.GenerativeModel(model_name, system_instruction=SYSTEM_PROMPT)
            
            # Prepare parts
            current_parts = [user_message]
            
            if file_path:
                # Use Gemini File API for PDFs and robust image handling
                print(f"Uploading file to Gemini: {file_path}")
                gemini_file = genai.upload_file(path=file_path)
                
                # Wait for processing if it's a document/video
                if file_path.lower().endswith('.pdf'):
                    while gemini_file.state.name == "PROCESSING":
                        print("Waiting for file processing...")
                        time.sleep(2)
                        gemini_file = genai.get_file(gemini_file.name)
                
                current_parts.append(gemini_file)

            # Start chat with context
            chat = model.start_chat(history=history)
            response = chat.send_message(current_parts)
            
            return {
                'text': response.text,
                'model_used': model_name,
                'status': 'success'
            }
            
        except exceptions.ResourceExhausted as e:
            print(f"Model {model_name} quota exceeded...")
            last_error = e
            continue
        except Exception as e:
            print(f"Error with {model_name}: {str(e)}")
            last_error = e
            continue

    raise last_error or Exception("All models failed")

@app.route('/chat', methods=['POST'])
def chat():
    # Handle multipart/form-data
    user_message = request.form.get('message')
    session_id = request.form.get('sessionId', 'default')
    
    if not user_message:
        return jsonify({'error': 'No message provided'}), 400

    file_path = None

    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(f"{int(time.time())}_{file.filename}")
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

    # Save user message to DB
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("INSERT INTO messages (session_id, role, content, image_path) VALUES (?, ?, ?, ?)", 
              (session_id, "user", user_message, file_path))
    conn.commit()
    conn.close()

    try:
        # Get history for context
        full_history = get_chat_history(session_id)
        
        # Exclude the message we just inserted (the very last one) from history
        context_history = full_history[:-1]
        
        # Use fallback generation
        result = generate_with_fallback(session_id, user_message, context_history, file_path=file_path)
        
        bot_response = result['text']
        model_used = result['model_used']
        
        # Save bot response to DB
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)", 
                  (session_id, "assistant", bot_response))
        conn.commit()
        conn.close()
        
        # Convert markdown to HTML for frontend
        html_response = markdown.markdown(bot_response)
        
        return jsonify({
            'response': bot_response,
            'html_response': html_content if 'html_content' in locals() else html_response,
            'model_used': model_used,
            'user_image_url': f"/uploads/{os.path.basename(file_path)}" if file_path else None
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/sessions')
def get_sessions():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Get distinct sessions with their first message timestamp and content preview
    query = """
        SELECT session_id, MIN(timestamp) as start_time,
        (SELECT content FROM messages m2 WHERE m2.session_id = m1.session_id ORDER BY id ASC LIMIT 1) as preview
        FROM messages m1
        GROUP BY session_id
        ORDER BY start_time DESC
    """
    c.execute(query)
    rows = c.fetchall()
    conn.close()
    
    sessions = []
    for r in rows:
        sessions.append({
            'id': r[0],
            'timestamp': r[1],
            'preview': r[2][:30] + '...' if r[2] else 'New Chat'
        })
    return jsonify(sessions)

@app.route('/api/history/<session_id>')
def get_session_history(session_id):
    history = get_chat_history(session_id)
    # The get_chat_history function adds system prompt, we might want just the visible messages for the UI
    # But sticking to what the UI expects for now.
    # Actually, the front-end will likely want to render the formatted HTML.
    # Let's return the raw db rows so frontend can render them
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT role, content, image_path FROM messages WHERE session_id = ? ORDER BY id ASC", (session_id,))
    rows = c.fetchall()
    conn.close()
    
    messages = []
    for row in rows:
        messages.append({
            'role': row['role'],
            'content': markdown.markdown(row['content']), # Send HTML ready content
            'image_url': f"/uploads/{os.path.basename(row['image_path'])}" if row['image_path'] else None
        })
    return jsonify(messages)

@app.route('/clear_history', methods=['POST'])
def clear_history():
    data = request.json
    session_id = data.get('sessionId')
    
    conn = get_db_connection()
    c = conn.cursor()
    if session_id:
        c.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    else:
        # Default behavior if no ID (though specific ID is safer)
        pass 
    conn.commit()
    conn.close()
    
    return jsonify({'status': 'cleared'})

@app.route('/db')
def view_database():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM messages ORDER BY id DESC")
    rows = c.fetchall()
    conn.close()
    return render_template('database.html', messages=rows)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
