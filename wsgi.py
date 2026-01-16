from server import app
import webbrowser
import threading
import time

def open_browser():
    time.sleep(1.5) # Wait a bit for server to start
    webbrowser.open("http://localhost:8080")

if __name__ == "__main__":
    from waitress import serve
    print("-------------------------------------------------------")
    print("   Starting Gemini AI Agent...")
    print("   Access URL: http://localhost:8080")
    print("-------------------------------------------------------")
    
    # Open browser in a separate thread
    threading.Thread(target=open_browser).start()
    
    # Run server (threads=6 is usually good for desktop responsiveness)
    serve(app, host="127.0.0.1", port=8080, threads=6)
