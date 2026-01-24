# School Hub - Quick Start Guide

## 🚀 Automatic Startup Setup (One-Time Setup)

Follow these simple steps to make School Hub start automatically when your computer boots up.

---

## Step 1: Prerequisites Check ✅

Make sure you have these installed on your computer:

- ✅ **Python** (version 3.11 or higher)
- ✅ **Node.js** (version 18 or higher)
- ✅ **PostgreSQL** (if using local database)
- ✅ **All project dependencies installed**

> **Note:** If you're not sure, ask your IT administrator or refer to the main README.md for installation instructions.

---

## Step 2: Setup Automatic Startup 🎯

### **Easiest Method (Recommended):**

1. Navigate to the `windows-startup` folder in your project
2. **Double-click** `setup-startup.bat`
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
   - Verify all project dependencies are installed

### Port already in use?

- Close any other applications using ports 3000 or 8000
- Or restart your computer

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
- The servers run in the background (you won't see command windows)
- Wait 30-60 seconds after boot before accessing the application
- If you close the browser, the app is still running - just refresh the page

---

## ✅ Setup Complete!

Once you've completed Step 2, you're all set! The School Hub will start automatically every time you turn on your computer.

**No more manual commands needed!** 🎊

---

*For detailed information, troubleshooting, and advanced configuration, see `README.md`*
