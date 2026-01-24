' ============================================
' School Hub - Silent Startup Wrapper
' This VBScript runs the batch file silently (no command window)
' ============================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)
batFile = scriptPath & "\start-school-hub.bat"

' Check if batch file exists
If Not fso.FileExists(batFile) Then
    MsgBox "Error: Could not find start-school-hub.bat in the same directory.", vbCritical, "School Hub Startup Error"
    WScript.Quit
End If

' Run the batch file in a hidden window
WshShell.Run """" & batFile & """", 0, False

' Release objects
Set WshShell = Nothing
Set fso = Nothing
