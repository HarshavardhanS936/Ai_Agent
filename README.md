# Gemini AI Chatbot

A simple, open LLM-based chatbot application built with **Flask** and **Google's Gemini API**.

## Features

- 🤖 **Powered by Gemini 2.5 Flash** - Fast and intelligent responses
- 💬 **Conversational Memory** - Persistent history using SQLite database
- 🧠 **General Purpose** - Ask anything, not restricted to specific topics
- 🎨 **Modern Chat UI** - Clean HTML/CSS interface
- 🐍 **Python & Flask** - Lightweight backend without complex dependencies

## Prerequisites

- Python 3.8 or higher
- A Google Gemini API key

## Installation

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure API Key:**
   - Create a `.env` file (copy from `.env.example`)
   - Add your key: `GEMINI_API_KEY=your_key_here`

### Running in Production (Recommended)
Double-click `run_prod.bat` or run it from the terminal:

**Command Prompt (cmd):**
```cmd
run_prod.bat
```

**PowerShell:**
```powershell
.\run_prod.bat
```
(PowerShell requires the `.\` prefix for scripts in the current directory)

3. **Start chatting!**


3. **Start chatting:**
   
   Type your VLSI/ECE questions in the input box and click "Send" or press Enter!

## Usage Examples

Try asking questions like:
- "What is the difference between combinational and sequential circuits?"
- "Explain how a CMOS inverter works"
- "What are the steps in VLSI design flow?"
- "Can you help me understand setup and hold time?"
- "How does a PLL work in communication systems?"

## Project Structure

```
d:\Ai_Agent\
├── app.py              # Main Streamlit application
├── requirements.txt    # Python dependencies
├── .env.example        # Example environment file
├── .env               # Your actual API key (git-ignored)
└── README.md          # This file
```

## Key Features Explained

### Conversational Memory
The chatbot maintains conversation context using Streamlit's `session_state`. All previous messages are sent to the Gemini API with each new request, allowing the bot to reference earlier parts of the conversation.

### System Prompt
The chatbot is configured with a specialized system prompt that guides it to act as a VLSI/ECE technical tutor. This helps it provide more focused and educational responses.

### Security
Your API key is stored in the `.env` file which should never be committed to version control. The key is loaded at runtime and is not exposed in the user interface.

## Troubleshooting

**Error: "GEMINI_API_KEY not found in environment variables"**
- Make sure you created the `.env` file in the same directory as `app.py`
- Verify the API key is correctly set in the `.env` file
- The format should be: `GEMINI_API_KEY=your_actual_key_here` (no quotes)

**Error: "Invalid API key"**
- Verify your API key is correct
- Check if the API key has been activated in Google AI Studio
- Make sure there are no extra spaces in the `.env` file

**Port already in use**
- If port 8501 is busy, use: `streamlit run app.py --server.port 8502`

## Customization

### Change the System Prompt
Edit the `SYSTEM_PROMPT` variable in `app.py` to change the chatbot's personality or expertise area.

### Use a Different Model
Change `'gemini-1.5-flash'` in `app.py` to another Gemini model like `'gemini-1.5-pro'` for more advanced capabilities.

### Modify the UI
The chat interface styling is in the CSS section at the top of `app.py`. Customize colors, spacing, and layout as needed.

## Technologies Used

- **Streamlit** - Web framework for Python
- **Google Generative AI SDK** - Official Gemini API client
- **python-dotenv** - Environment variable management

## License

This project is provided as-is for educational purposes.

## Notes

- This application runs locally and does not require Google Cloud Platform or billing setup
- The Gemini API has free tier quotas - check the [Google AI Studio](https://makersuite.google.com/) for current limits
- No user data is stored; each session is independent
