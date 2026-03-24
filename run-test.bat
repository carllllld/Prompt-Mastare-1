@echo off
call npm test -- server/tests/critical-quality-fixes-preservation.test.ts -t "3.8"
