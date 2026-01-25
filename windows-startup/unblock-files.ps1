# ============================================
# School Hub - Unblock Files Script
# This script removes the "Mark of the Web" from files downloaded from the internet
# ============================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "School Hub - Unblocking Files" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Files to unblock
$filesToUnblock = @(
    "start-school-hub.bat",
    "start-school-hub-silent.vbs",
    "setup-startup.bat"
)

$unblockedCount = 0

foreach ($file in $filesToUnblock) {
    $filePath = Join-Path $scriptDir $file
    
    if (Test-Path $filePath) {
        try {
            # Unblock the file
            Unblock-File -Path $filePath -ErrorAction SilentlyContinue
            Write-Host "✓ Unblocked: $file" -ForegroundColor Green
            $unblockedCount++
        } catch {
            Write-Host "✗ Failed to unblock: $file" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠ File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
if ($unblockedCount -gt 0) {
    Write-Host "Successfully unblocked $unblockedCount file(s)!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run the setup scripts normally." -ForegroundColor Cyan
} else {
    Write-Host "No files were unblocked. They may already be unblocked or not found." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
