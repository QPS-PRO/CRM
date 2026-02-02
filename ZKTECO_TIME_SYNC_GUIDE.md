# ZKTeco Device Time Sync Configuration Guide

This guide will help you configure your ZKTeco fingerprint device to automatically sync its time with your server.

## Prerequisites

1. Your server is running and accessible from the device network
2. The device and server are on the same network (or network routing is configured)
3. You know your server's IP address or hostname
4. You have access to the device's web interface


- **Server IP**: Your server's IP address (e.g., `192.168.1.100` or your public IP)
- **Server URL**: `http://YOUR_SERVER_IP/iclock/getrequest` or `http://your-domain.com/iclock/getrequest`

## Step 2: Access Device Web Interface

1. **Find your device IP address**:
   - Check the device display screen
   - Or check your router's connected devices list
   - Or use the IP from your device configuration in the system

2. **Open web browser** and navigate to:
   ```
   http://DEVICE_IP_ADDRESS
   ```
   Example: `http://192.168.1.50`

3. **Login** to the device web interface:
   - Default username: `admin`
   - Default password: `admin` or check device manual
   - Some devices use: username `admin`, password `123456` or empty

## Step 3: Configure Time Sync Settings

The exact menu names may vary by device model, but look for these options:

### Method 1: System → Time Settings (Most Common)

1. Navigate to: **System** → **Time Settings** or **System** → **Time**
2. Look for **Time Sync** or **Time Synchronization** section
3. Configure:
   - **Time Sync Mode**: Select `HTTP` or `ADMS` (NOT NTP)
   - **Time Server URL**: Enter your server URL:
     ```
     http://YOUR_SERVER_IP/iclock/getrequest
     ```
     Example: `http://192.168.1.100/iclock/getrequest`
   - **Sync Interval**: Set to `30` seconds or `1` minute (recommended)
   - **Enable Time Sync**: Check this box ✅
   - **Auto Sync**: Enable ✅

### Method 2: Communication → Time Sync (Alternative)

1. Navigate to: **Communication** → **Time Sync** or **Network** → **Time Sync**
2. Enable **Server Time Sync**
3. Set **Sync Method** to: `HTTP` or `ADMS`
4. Enter **Server URL**: `http://YOUR_SERVER_IP/iclock/getrequest`
5. Set **Sync Frequency**: Every 30-60 seconds

### Method 3: Advanced Settings (If above don't work)

1. Navigate to: **System** → **Advanced Settings** or **System** → **Configuration**
2. Look for:
   - **Time Server Mode**: Enable
   - **Time Sync Protocol**: Select `HTTP` or `ADMS`
   - **Time Server Address**: `YOUR_SERVER_IP`
   - **Time Server Port**: `80` (or `8000` if your server uses that port)
   - **Time Server Path**: `/iclock/getrequest`

## Step 4: Disable NTP (Important!)

**If NTP is enabled, it will conflict with server time sync:**

1. Go to: **System** → **Time Settings** → **NTP Settings**
2. **Disable NTP** or set it to `Off`
3. Some devices have a toggle: Switch from `NTP` to `HTTP/ADMS`

## Step 5: Set Device to Slave Mode (If Available)

Some devices require "Slave Mode" for time synchronization:

1. Navigate to: **System** → **Device Mode** or **Communication** → **Mode**
2. Set device mode to: **Slave Mode** or **Client Mode**
3. Save settings

## Step 6: Save and Apply Settings

1. Click **Save** or **Apply** button
2. Device may restart automatically
3. Wait for device to reboot (usually 30-60 seconds)

## Step 7: Verify Configuration

### Check Server Logs

After device reboots, check your server logs. You should see:

```
🕐 Time sync request from device RKQ4243400358
   Server UTC time: 2026-01-29 19:47:20
   Server local time (Asia/Riyadh): 2026-01-29 22:47:20
   Sending to device: 2026-01-29 22:47:20
   📤 Sending: GetTime XML with standard time format
```

### Check Device Time

1. Go back to device web interface
2. Navigate to: **System** → **Time Settings**
3. Check if device time matches server time
4. Or check the device display screen - time should match server

### Test Time Sync Manually

1. In device web interface, look for **Sync Now** or **Test Sync** button
2. Click it to manually trigger time sync
3. Check server logs to see if request is received

## Step 8: Troubleshooting

### Problem: Device time still not syncing

**Solution 1: Check Network Connectivity**
```bash
# From device network, test if server is reachable
ping YOUR_SERVER_IP

# Test HTTP connection
curl http://YOUR_SERVER_IP/iclock/getrequest?SN=DEVICE_SERIAL
```

**Solution 2: Check Firewall**
- Ensure port 80 (or 8000) is open on server
- Check if firewall is blocking device IP

**Solution 3: Try Alternative Format**
- Some devices need different format
- Test with: `http://YOUR_SERVER_IP/iclock/getrequest?SN=XXX&format=iso&cmd=settime`

**Solution 4: Check Device Firmware**
- Update device firmware if possible
- Some older firmware versions have time sync bugs

**Solution 5: Verify Server Response**
- Check server logs for time sync requests
- Verify response is being sent correctly
- Check if device is receiving the response

### Problem: Device can't reach server

**Check:**
1. Device and server on same network?
2. Server IP address is correct?
3. Server is running and accessible?
4. Port 80/8000 is not blocked?

### Problem: Time sync works but time is wrong

**Check:**
1. Server timezone setting (`TIME_ZONE` in Django settings)
2. Device timezone setting (should match server)
3. Both should be in same timezone (e.g., Asia/Riyadh)

## Step 9: Verify Automatic Sync

After configuration, the device should automatically sync time every 30-60 seconds. You can verify by:

1. **Check server logs** - Should see periodic time sync requests
2. **Change server time** - Device should update within sync interval
3. **Monitor device time** - Should stay synchronized with server

## Example Configuration Summary

```
Device IP: 192.168.1.50
Server IP: 192.168.1.100
Server Port: 8000

Time Sync URL: http://192.168.1.100:8000/iclock/getrequest
Sync Method: HTTP/ADMS
Sync Interval: 30 seconds
NTP: Disabled
Auto Sync: Enabled
```

## Quick Reference: Server Endpoint

Your server endpoint for time sync is:
```
http://YOUR_SERVER_IP/iclock/getrequest?SN=DEVICE_SERIAL
```

The device will automatically add the `SN` parameter, so you only need to configure:
```
http://YOUR_SERVER_IP/iclock/getrequest
```

## Need Help?

If time sync still doesn't work after following these steps:

1. Check server logs for error messages
2. Verify device model and firmware version
3. Check ZKTeco device manual for model-specific instructions
4. Try accessing device web interface and look for "Time Sync" or "Server Time" options
5. Contact ZKTeco support with your device model number

## Notes

- Time sync happens automatically every 30-60 seconds (configurable)
- Device will sync time on startup and then periodically
- If device loses connection, it will retry when connection is restored
- Server time is the source of truth - device will always sync to server time
