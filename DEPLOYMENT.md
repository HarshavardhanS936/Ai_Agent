# Deploying to PythonAnywhere (via GitHub)

Follow these steps to deploy using GitHub. This is better for updates!

## Prerequisites
1.  **Sign up** at [www.pythonanywhere.com](https://www.pythonanywhere.com).
2.  **GitHub Repo**:
    - Create a new repository on GitHub.
    - Push your code to it (Check `Step 0` below if you haven't done this).

## Step 0: Push Code to GitHub (Local Terminal)
Run these commands in your `d:\Ai_Agent` terminal:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 1: Clone on PythonAnywhere
1.  Log in to PythonAnywhere Dashboard.
2.  Open a **Bash** console.
3.  Run these commands:
    ```bash
    # Clone your repository
    git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git mysite

    # Enter the folder
    cd mysite
    ```

## Step 2: Install Dependencies & Setup
1.  In the same console:
    ```bash
    pip3 install -r requirements.txt
    ```
2.  **Create .env file** (Because we ignored it for security):
    - Run: `nano .env`
    - Paste your `GEMINI_API_KEY=your_key_here`
    - Press `Ctrl+X`, then `Y`, then `Enter` to save.

## Step 3: Configure Web App
1.  Go to the **Web** tab.
2.  Click **Add a new web app**.
3.  Click **Next** -> Select **Flask** -> Select **Python 3.10** (or latest).
4.  **Path**: Enter `/home/yourusername/mysite/server.py`.
5.  Click **Next** until created.

## Step 4: Final Setup (Crucial)
1.  Scroll down to the **Code** section.
2.  Click the **WSGI configuration file** link.
3.  **DELETE everything** and **PASTE** the content of `pa_wsgi.py`.
    *(Make sure to change `yourusername` in the code!)*.
4.  Save the file.

## Step 5: Launch!
1.  Go back to the **Web** tab.
2.  Click **Reload**.
3.  Visit your site!

---
## Continuous Delivery (CI/CD) Workflow
Since PythonAnywhere's Free Tier doesn't allow automated webhooks, your "Deployment Pipeline" is semi-automated:

1.  **Develop**: Make changes on your PC.
2.  **Push**: `git push origin main`
3.  **Pull (Deploy)**:
    - Open PythonAnywhere Bash Console.
    - Run: `cd mysite && git pull`
4.  **Reload**:
    - Go to Web Tab -> Click **Reload**.

*> **Note:** To fully automate this (so `git push` automatically updates the site), you would need a Paid PythonAnywhere account to use their API for reloading the web app.*
