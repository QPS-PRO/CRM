# Troubleshooting Guide

## Common Issues and Solutions

---

## 🔒 Issue: Scripts Don't Work After Downloading ZIP from GitHub

### Problem
When you download the project as a ZIP file from GitHub and extract it, the `.bat` and `.vbs` files may not run. You might see:
- "Windows cannot access the specified device, path, or file"
- Scripts run but nothing happens
- Permission errors

### Why This Happens
Windows has a security feature called "Mark of the Web" (Zone.Identifier). When files are downloaded from the internet (like ZIP files from GitHub), Windows marks them as potentially unsafe and blocks script execution. This is a security measure to protect your computer.

**Note:** This issue does NOT occur when you use `git clone` because git doesn't trigger Windows' download security.

### Solutions

#### ✅ Solution 1: Automatic (Recommended)
The `setup-startup.bat` script now automatically unblocks files. Just run it:
1. Double-click `setup-startup.bat`
2. It will automatically unblock all script files
3. Continue with the setup

#### ✅ Solution 2: Use Unblock Script
1. Double-click `unblock-files.bat`
2. Wait for it to complete
3. Then run `setup-startup.bat`

#### ✅ Solution 3: Manual Unblock
1. Right-click on each `.bat` and `.vbs` file in the `windows-startup` folder
2. Select **Properties**
3. At the bottom of the Properties window, you'll see a security warning
4. Check the **"Unblock"** checkbox
5. Click **OK**
6. Repeat for all `.bat` and `.vbs` files

#### ✅ Solution 4: PowerShell Command
1. Open PowerShell in the `windows-startup` folder
2. Run this command:
   ```powershell
   Get-ChildItem *.bat, *.vbs | Unblock-File
   ```

#### ✅ Solution 5: Use Git Instead
If possible, use `git clone` instead of downloading ZIP:
```bash
git clone [your-repo-url]
```
This avoids the issue entirely.

---

## 🚫 Issue: "Python is not recognized"

### Problem
Scripts fail with "Python is not installed or not in PATH"

### Solution
1. Install Python from https://www.python.org/downloads/
2. **Important:** During installation, check "Add Python to PATH"
3. Restart your computer after installation
4. Verify: Open Command Prompt and type `python --version`

---

## 🚫 Issue: "Node.js is not recognized"

### Problem
Scripts fail with "Node.js is not installed or not in PATH"

### Solution
1. Install Node.js from https://nodejs.org/
2. Restart your computer after installation
3. Verify: Open Command Prompt and type `node --version`

---

## 🔌 Issue: Port Already in Use

### Problem
Error messages about ports 3000 or 8000 being already in use

### Solution
1. **Find what's using the port:**
   ```cmd
   netstat -ano | findstr :8000
   netstat -ano | findstr :3000
   ```

2. **Kill the process** (replace PID with the number from step 1):
   ```cmd
   taskkill /PID [PID] /F
   ```

3. **Or restart your computer** to clear all ports

---

## 🗄️ Issue: Database Connection Errors

### Problem
Backend fails to start due to database connection errors

### Solution
1. **Check if PostgreSQL is running:**
   - Open Services (`Win + R`, type `services.msc`)
   - Find PostgreSQL service
   - Right-click → Start (if stopped)

2. **Or start via command:**
   ```cmd
   net start postgresql-x64-15
   ```
   (Adjust service name to match your installation)

3. **Verify database credentials** in `backend/.env` file

---

## 🔍 Issue: Application Doesn't Start on Boot

### Problem
After setting up automatic startup, the application doesn't start when Windows boots

### Solution
1. **Check if shortcut exists:**
   - Press `Win + R`, type `shell:startup`
   - Verify "School Hub Startup" shortcut exists

2. **Check Task Manager:**
   - Press `Ctrl + Shift + Esc`
   - Look for `python.exe` and `node.exe` processes
   - If missing, there's an error

3. **Test manually:**
   - Double-click `start-school-hub.bat` (not silent version)
   - Check for error messages
   - Fix any issues

4. **Check Windows Event Viewer:**
   - Press `Win + R`, type `eventvwr.msc`
   - Check "Windows Logs" → "Application" for errors

5. **Verify file paths:**
   - Make sure the project path in the shortcut is correct
   - If you moved the project folder, recreate the shortcut

---

## ⚠️ Issue: Scripts Run But Nothing Happens

### Problem
Scripts execute but servers don't start

### Solution
1. **Check for errors:**
   - Run `start-school-hub.bat` (not silent) to see error messages
   - Look for Python/Node errors

2. **Verify dependencies:**
   ```cmd
   cd backend
   python -m pip list
   ```
   Make sure all packages from `requirements.txt` are installed

3. **Check virtual environment:**
   - If using venv, make sure it's activated
   - The script should handle this automatically

---

## 📝 Still Need Help?

1. Check the main project README.md
2. Review error messages carefully
3. Contact your IT administrator
4. Check Windows Event Viewer for system errors

---

## 💡 Prevention Tips

1. **Use Git Clone:** Instead of downloading ZIP, use `git clone` to avoid file blocking issues
2. **Keep Dependencies Updated:** Regularly update Python packages and Node modules
3. **Check Logs:** Always check error messages in the command windows
4. **Test Before Setup:** Test `start-school-hub.bat` manually before setting up automatic startup
