@echo off
REM QUICK DEPLOY COMMANDS - OptiPrompt v2.9.3
REM Run this batch file to deploy all 29 bug fixes (Windows)

echo.
echo ========================================
echo   OptiPrompt v2.9.3 Deployment
echo ========================================
echo.

REM Step 1: Verify current status
echo [Step 1] Verify Status
echo ------------------------
git branch
git status
echo.

REM Step 2: Run TypeScript check
echo [Step 2] TypeScript Check
echo ---------------------------
call npm run check
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: TypeScript check failed!
    pause
    exit /b 1
)
echo SUCCESS: TypeScript check passed
echo.

REM Step 3: Clean old builds
echo [Step 3] Clean Old Builds
echo ---------------------------
if exist dist (
    echo Removing old dist directory...
    rmdir /s /q dist
    echo SUCCESS: Old builds removed
) else (
    echo INFO: No old builds to remove
)
echo.

REM Step 4: Build production code
echo [Step 4] Build Production Code
echo --------------------------------
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo SUCCESS: Build completed
echo.

REM Step 5: Verify build output
echo [Step 5] Verify Build Output
echo ------------------------------
if exist dist\index.mjs (
    echo SUCCESS: dist\index.mjs exists
    dir dist\index.mjs
) else (
    echo ERROR: dist\index.mjs not found!
    pause
    exit /b 1
)

if exist dist\public (
    echo SUCCESS: dist\public exists
) else (
    echo ERROR: dist\public not found!
    pause
    exit /b 1
)
echo.

REM Step 6: Git commit
echo [Step 6] Git Commit
echo --------------------
git add .
git commit -m "fix: Deploy 29 bug fixes from complete codebase audit (v2.9.3)" -m "" -m "Critical fixes:" -m "- Fix Expert Analyzer crashes (BUG #1, #2)" -m "- Fix UI rendering issues (BUG #3, #5, #7)" -m "- Fix memory leaks in hooks (BUG #13, #14)" -m "- Fix validation and error handling (BUG #15, #16, #17, #26, #28, #29, #30)" -m "- Fix security issues (BUG #11, #25)" -m "- Fix race conditions (BUG #17, #19, #30)" -m "- Fix graceful shutdown issues (BUG #31-37)" -m "" -m "All fixes verified through systematic codebase audit." -m "See COMPLETE_BUG_AUDIT_2026-03-21.md for details." -m "" -m "Audit stats:" -m "- 120/120 files reviewed (100%%)" -m "- 29 critical bugs fixed" -m "- All categories complete"

if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Commit failed (maybe nothing to commit?)
) else (
    echo SUCCESS: Changes committed
)
echo.

REM Step 7: Push to Git
echo [Step 7] Push to Git
echo ---------------------
echo.
echo WARNING: This will push to origin main and trigger deployment!
echo.
set /p CONFIRM="Continue with push? (Y/N): "
if /i "%CONFIRM%" NEQ "Y" (
    echo.
    echo Deployment cancelled.
    echo Run 'git push origin main' manually when ready.
    pause
    exit /b 0
)

git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Push failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOYMENT STARTED!
echo ========================================
echo.
echo Next steps:
echo 1. Go to Render Dashboard: https://dashboard.render.com
echo 2. Select your OptiPrompt service
echo 3. Click 'Events' tab to monitor deployment
echo 4. Wait for 'Deploy live' message (~5-10 minutes)
echo 5. Run post-deployment verification
echo.
echo Expected improvements:
echo - Expert analysis works without crashes
echo - Google Fonts load correctly
echo - Text shows with paragraph breaks
echo - Feedback panel is interactive
echo - No memory leaks
echo - Toast notifications on errors
echo - Graceful shutdown
echo.
echo See DEPLOYMENT_READY_v2.9.3.md for verification steps.
echo.
pause
