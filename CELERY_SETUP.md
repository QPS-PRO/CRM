# Celery Setup Guide

This project uses Celery for background task processing and periodic task scheduling.

## Prerequisites

1. **Redis** must be installed and running
   - Install Redis: `brew install redis` (macOS) or `apt-get install redis-server` (Linux)
   - Start Redis: `redis-server`
   - Redis should be running on `localhost:6379` by default
   
2. **Clear Redis Queue** (if seeing errors about unknown tasks)
   - If you see errors about tasks from other projects (like `users.tasks.*`), clear the Redis database:
   - For database 1: `redis-cli -n 1 FLUSHDB`
   - Or connect to Redis: `redis-cli` then `SELECT 1` then `FLUSHDB`

## Configuration

### Environment Variables

Add these to your `.env` file (optional, defaults shown):

```env
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

**Note:** We use Redis database `1` instead of `0` to avoid conflicts with other projects that may be using Redis database `0`.

## Running Celery

### 1. Start Redis (if not already running)

```bash
redis-server
```

### 2. Start Celery Worker

In a separate terminal, run:

```bash
cd backend
celery -A schoolhub worker --loglevel=info
```

### 3. Start Celery Beat (for periodic tasks)

In another separate terminal, run:

```bash
cd backend
celery -A schoolhub beat --loglevel=info
```

### 4. Start Django Server

```bash
cd backend
python manage.py runserver
```

## Periodic Tasks

The following periodic tasks are automatically configured:

1. **Student Sync**: Runs daily at midnight (00:00)
   - Syncs all active students to their respective fingerprint devices
   - Task name: `attendance.sync_students`

2. **Attendance Sync**: Runs every minute
   - Syncs attendance records from all active fingerprint devices
   - Task name: `attendance.sync_attendance`

## Manual Task Execution

You can also trigger tasks manually:

```python
from attendance.tasks import sync_students_task, sync_attendance_task

# Sync all students
sync_students_task.delay()

# Sync students for specific device
sync_students_task.delay(device_id=1)

# Sync attendance from all devices
sync_attendance_task.delay()

# Sync attendance from specific device
sync_attendance_task.delay(device_id=1)
```

## Management Commands

You can still use management commands directly:

```bash
# Sync all students
python manage.py sync_students

# Sync students for specific device
python manage.py sync_students --device-id 1

# Sync attendance from all devices
python manage.py sync_attendance

# Sync attendance from specific device
python manage.py sync_attendance --device-id 1
```

## Monitoring Tasks

### Using Django Admin

1. Run migrations to create Celery Beat tables:
   ```bash
   python manage.py migrate
   ```

2. Access Django admin at `/admin/`
3. Navigate to "Periodic Tasks" to view and manage scheduled tasks

## Changing Task Schedule from Admin Panel

You can easily change when periodic tasks run directly from the Django admin panel. Here's how:

### Step-by-Step Guide

#### 1. Access Django Admin
- Navigate to `http://localhost:8000/admin/` (or your server URL)
- Log in with your admin credentials

#### 2. Navigate to Periodic Tasks
- In the Django admin homepage, find the **"PERIODIC TASKS"** section
- Click on **"Periodic tasks"** link
- You'll see a list of all scheduled tasks (e.g., "Sync Attendance Every Minute", "Sync Students Every Minute")

#### 3. Edit a Task
- Click on the task name you want to modify (e.g., "Sync Students Every Minute")
- You'll see the task details page

#### 4. Change the Schedule

You have two options for scheduling:

##### Option A: Using Interval Schedule (e.g., every X minutes/hours/days)

1. Find the **"Interval"** field
2. Select or create an interval:
   - Click the **+ (plus)** button next to the dropdown
   - Choose the **"Every"** number (e.g., 1, 5, 30)
   - Choose the **"Period"** (Minutes, Hours, Days)
   - Click **"Save and continue editing"** (if creating new)
   - Go back to your periodic task and select this interval from the dropdown
3. **Clear the Crontab field** (if it has a value) - you can't use both Interval and Crontab
4. Make sure **"Enabled"** is checked
5. Click **"Save"**

**Examples:**
- **Every 1 minute**: Every = `1`, Period = `Minutes`
- **Every 5 minutes**: Every = `5`, Period = `Minutes`
- **Every 1 hour**: Every = `1`, Period = `Hours`
- **Every day**: Every = `1`, Period = `Days`

##### Option B: Using Crontab Schedule (e.g., specific time of day)

1. Find the **"Crontab"** field
2. Select or create a crontab:
   - Click the **+ (plus)** button next to the dropdown
   - Fill in the schedule:
     - **Minute**: `0` (or `0,30` for every 30 minutes)
     - **Hour**: `0` (midnight) or `12` (noon) or `*/6` (every 6 hours)
     - **Day of week**: `*` (all days) or `1` (Monday) or `1-5` (weekdays)
     - **Day of month**: `*` (all days) or `1` (1st of month)
     - **Month of year**: `*` (all months) or `1` (January)
   - Select your **Timezone** (important!)
   - Click **"Save and continue editing"** (if creating new)
   - Go back to your periodic task and select this crontab from the dropdown
3. **Clear the Interval field** (if it has a value) - you can't use both
4. Make sure **"Enabled"** is checked
5. Click **"Save"**

**Examples:**
- **Daily at midnight**: Minute = `0`, Hour = `0`, others = `*`
- **Daily at 6 AM**: Minute = `0`, Hour = `6`, others = `*`
- **Every Monday at 8 AM**: Minute = `0`, Hour = `8`, Day of week = `1`, others = `*`
- **Every hour**: Minute = `0`, Hour = `*`, others = `*`

### Common Schedule Changes

#### Change Student Sync from Testing (Every Minute) to Production (Daily at Midnight)

1. Go to Periodic Tasks → "Sync Students Every Minute"
2. Click **"Crontab"** field and click the **+** button
3. Create new crontab:
   - Minute: `0`
   - Hour: `0`
   - Day of week: `*`
   - Day of month: `*`
   - Month of year: `*`
   - Timezone: Select your timezone (e.g., Africa/Cairo)
   - Save
4. Go back to the periodic task
5. Select the new crontab from the **"Crontab"** dropdown
6. **Clear the "Interval"** field (set it to `---`)
7. Update the **"Name"** to "Sync Students Daily at Midnight" (optional)
8. Click **"Save"**

#### Change Student Sync from Daily to Every Minute (For Testing)

1. Go to Periodic Tasks → "Sync Students Daily at Midnight"
2. If an interval for "Every 1 minute" exists, select it from **"Interval"** dropdown
   - If not, create one: Click **+**, Every = `1`, Period = `Minutes`, Save
3. **Clear the "Crontab"** field (set it to `---`)
4. Update the **"Name"** to "Sync Students Every Minute" (optional)
5. Click **"Save"**

### Important Notes

- ⚠️ **You cannot use both Interval and Crontab** - only one should be set, the other should be `---`
- ✅ Always make sure **"Enabled"** checkbox is checked
- ✅ Changes take effect immediately - no need to restart Celery Beat (it reads from the database)
- 📝 The **"Name"** field is just for identification - it doesn't affect when the task runs
- 🎯 The **"Task"** field shows which Python function will be called (e.g., `attendance.sync_students`)
- ⏰ **Timezone** is important for Crontab schedules - make sure it matches your server timezone

### Using Flower (Optional)

Flower is a web-based tool for monitoring Celery:

```bash
pip install flower
celery -A schoolhub flower
```

Then visit `http://localhost:5555` to view task status.

## Production Deployment

For production, use a process manager like Supervisor or systemd to keep Celery worker and beat running:

### Supervisor Example

```ini
[program:celery_worker]
command=/path/to/venv/bin/celery -A schoolhub worker --loglevel=info
directory=/path/to/backend
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/celery/worker.log

[program:celery_beat]
command=/path/to/venv/bin/celery -A schoolhub beat --loglevel=info
directory=/path/to/backend
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/celery/beat.log
```

## Troubleshooting

1. **Tasks not running**: Ensure Redis is running and Celery worker is started
2. **Periodic tasks not executing**: Ensure Celery Beat is running
3. **Connection errors**: Check Redis connection settings in `.env`
4. **Task errors**: Check Celery worker logs for detailed error messages

