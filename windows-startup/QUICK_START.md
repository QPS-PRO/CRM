# School Hub - Quick Start Guide

## 🚀 Automatic Startup Setup (One-Time Setup)

Follow these simple steps to make School Hub start automatically when your computer boots up.

---

## Step 1: Prerequisites Check ✅

Make sure you have these installed on your computer:

- ✅ **Python** (version 3.11 or higher)
- ✅ **Node.js** (version 18 or higher)
- ✅ **PostgreSQL** (if using local database)
- ✅ **Redis** (required for Celery background tasks)
- ✅ **All project dependencies installed**

> **Note:** If you're not sure, ask your IT administrator or refer to the main README.md for installation instructions.

---

## Step 2: Setup Automatic Startup 🎯

> **⚠️ Important:** If you downloaded the project as a **ZIP file from GitHub** (instead of using git clone), Windows may block the script files. The `setup-startup.bat` script will automatically fix this, but if you encounter issues, see the troubleshooting section below.

### **Easiest Method (Recommended):**

1. Navigate to the `windows-startup` folder in your project
2. **Double-click** `setup-startup.bat`
   - This will automatically unblock files if needed
3. Press any key when prompted
4. Done! ✅

### **Alternative Method (Manual):**

1. Press `Windows Key + R`
2. Type: `shell:startup`
3. Press Enter (this opens your Startup folder)
4. Right-click in the folder → **New** → **Shortcut**
5. Browse to: `[Your Project Path]\windows-startup\start-school-hub-silent.vbs`
6. Click **Next** → **Finish**

---

## Step 3: Test It! 🧪

1. **Restart your computer**
2. Wait **30-60 seconds** after Windows starts
3. Open your web browser
4. Go to: **http://localhost:3000**

If you see the School Hub login page, everything is working! 🎉

---

## 📍 Access URLs

After startup, you can access:

- **Main Application:** http://localhost:3000
- **Admin Panel:** http://localhost:8000/admin
- **API:** http://localhost:8000/api

---

## ❓ Troubleshooting

### Application doesn't start?

1. **Check if servers are running:**
   - Press `Ctrl + Shift + Esc` to open Task Manager
   - Look for `python.exe` and `node.exe` processes
   - If you don't see them, there might be an error

2. **Test manually:**
   - Double-click `start-school-hub.bat` (not the silent version)
   - This will show you any error messages
   - Fix any issues before using automatic startup

3. **Check dependencies:**
   - Make sure Python and Node.js are installed
   - Verify Redis is installed and running
   - Verify all project dependencies are installed

### Redis not starting?

- **If Redis is installed as Windows service:**
  - Open Services (`Win + R`, type `services.msc`)
  - Find "Redis" service
  - Right-click → Start (if stopped)
  - Set startup type to "Automatic"

- **If Redis is installed as executable:**
  - Make sure `redis-server.exe` is in your system PATH
  - Or update the script to use the full path to redis-server.exe

### Celery tasks not working?

- Ensure Redis is running (check the "School Hub Redis" window)
- Check the "School Hub Celery Worker" window for error messages
- Verify Redis connection settings in `backend/.env`:
  ```
  CELERY_BROKER_URL=redis://localhost:6379/1
  CELERY_RESULT_BACKEND=redis://localhost:6379/1
  ```

### Port already in use?

- Close any other applications using ports 3000 or 8000
- Or restart your computer

### Scripts don't work after downloading as ZIP from GitHub?

**This is a common Windows security feature!** When you download files from the internet, Windows blocks them for security.

**Solution 1 (Automatic):**
- The `setup-startup.bat` script automatically unblocks files
- Just run it and it will fix the issue

**Solution 2 (Manual - if Solution 1 doesn't work):**
1. Double-click `unblock-files.bat` in the `windows-startup` folder
2. Or right-click each `.bat` and `.vbs` file
3. Select **Properties**
4. At the bottom, check **"Unblock"**
5. Click **OK**
6. Try running `setup-startup.bat` again

**Solution 3 (PowerShell - Advanced):**
- Open PowerShell in the `windows-startup` folder
- Run: `Get-ChildItem *.bat, *.vbs | Unblock-File`

> **Note:** If you used `git clone` instead of downloading ZIP, this issue won't occur.

### Still having issues?

- Refer to the detailed `README.md` for more troubleshooting steps
- Contact your IT administrator

---

## 🛑 How to Stop Automatic Startup

If you want to disable automatic startup:

1. Press `Windows Key + R`
2. Type: `shell:startup`
3. Press Enter
4. Delete the **"School Hub Startup"** shortcut
5. Restart your computer to apply changes

---

## 📝 Important Notes

- The application will start **automatically** every time you boot your computer
- You don't need to run any commands manually after setup
- The following services will start automatically:
  - **Redis Server** (for background tasks)
  - **Celery Worker** (processes background tasks)
  - **Celery Beat** (schedules periodic tasks)
  - **Django Backend** (API server on port 8000)
  - **Vite Frontend** (web interface on port 3000)
- Each service runs in its own window (you can minimize them)
- Wait 30-60 seconds after boot before accessing the application
- If you close the browser, the app is still running - just refresh the page
- To stop all services, close all the "School Hub" windows

---

## ✅ Setup Complete!

Once you've completed Step 2, you're all set! The School Hub will start automatically every time you turn on your computer.

**No more manual commands needed!** 🎊

---

*For detailed information, troubleshooting, and advanced configuration, see `README.md`*
