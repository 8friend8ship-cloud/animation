@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "BRANCH=codex/video-promo-agent-workflow-20260823"
set "RAW=https://raw.githubusercontent.com/8friend8ship-cloud/animation/%BRANCH%/tools"
set "OUT=%USERPROFILE%\Desktop\Animation-Recovery-Result"
set "TMP=%TEMP%\animation-local-recovery"

if not exist "%OUT%" mkdir "%OUT%"
if not exist "%TMP%" mkdir "%TMP%"
del /q "%OUT%\01_APPS_SCRIPT_RECOVERY.txt" 2>nul
del /q "%OUT%\02_VERCEL_RECOVERY.txt" 2>nul
del /q "%OUT%\00_READ_ME.txt" 2>nul

echo [1/4] Downloading read-only recovery scripts V2...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing '%RAW%/Recover-AnimationRuntime-Lineage.ps1' -OutFile '%TMP%\Recover-AnimationRuntime-Lineage.ps1'; Invoke-WebRequest -UseBasicParsing '%RAW%/Recover-AnimationVercel-Lineage.ps1' -OutFile '%TMP%\Recover-AnimationVercel-Lineage.ps1'"
if errorlevel 1 goto :download_fail

echo [2/4] Reading existing Apps Script lineage only...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%TMP%\Recover-AnimationRuntime-Lineage.ps1" -DryRun > "%OUT%\01_APPS_SCRIPT_RECOVERY.txt" 2>&1
set "AS_EXIT=%ERRORLEVEL%"

echo [3/4] Reading existing Vercel lineage only...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%TMP%\Recover-AnimationVercel-Lineage.ps1" -ExpectedRepo "8friend8ship-cloud/animation" > "%OUT%\02_VERCEL_RECOVERY.txt" 2>&1
set "VC_EXIT=%ERRORLEVEL%"

echo [4/4] Writing summary...
(
  echo Animation local recovery summary V2
  echo Generated: %DATE% %TIME%
  echo.
  echo Apps Script recovery exit code: %AS_EXIT%
  echo Vercel recovery exit code: %VC_EXIT%
  echo.
  echo This launcher is READ-ONLY.
  echo It does NOT create OAuth, Apps Script projects, Vercel projects, links, or deployments.
  echo.
  echo Send these two files back to ChatGPT:
  echo 01_APPS_SCRIPT_RECOVERY.txt
  echo 02_VERCEL_RECOVERY.txt
) > "%OUT%\00_READ_ME.txt"

echo.
echo ============================================================
echo FINISHED V2
ECHO Result folder: "%OUT%"
echo Apps Script exit: %AS_EXIT%   Vercel exit: %VC_EXIT%
echo ============================================================
explorer.exe "%OUT%"
pause
exit /b 0

:download_fail
echo.
echo Download failed. Use the direct ChatGPT ZIP package instead.
pause
exit /b 10
