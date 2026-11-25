import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("ERROR: GEMINI_API_KEY not found in .env")
else:
    print(f"Using API Key ending in: {api_key[-5:]}")
    genai.configure(api_key=api_key)
    try:
        models = genai.list_models()
        print("Models:")
        for m in models:
            print(f"- {m.name} (Methods: {m.supported_generation_methods})")
    except Exception as e:
        print(f"Error: {e}")
