@echo off
setlocal EnableExtensions DisableDelayedExpansion

REM -----------------------------------------------------------------------------
REM Facilita V2 - .env setup only
REM -----------------------------------------------------------------------------

cd /d "%~dp0"

set "ENV_PATH=%CD%\.env"
set "ENV_CHANGED=0"

call :ensure_env_secure

if "%ENV_CHANGED%"=="0" echo Nenhuma alteracao necessaria.
echo.
echo .env ready at "%ENV_PATH%"
echo.
exit /b 0

:ensure_env_secure
set "ENV_TEMPLATE="

if not exist "%ENV_PATH%" (
  if exist ".env.production" (
    set "ENV_TEMPLATE=.env.production"
  ) else if exist ".env.example" (
    set "ENV_TEMPLATE=.env.example"
  )

  if not "%ENV_TEMPLATE%"=="" (
    copy "%ENV_TEMPLATE%" "%ENV_PATH%" >nul
  ) else (
    type nul > "%ENV_PATH%"
  )
)

REM Ensure .gitignore contains .env (avoid accidental commit)
if exist ".gitignore" (
  findstr /x /c:".env" ".gitignore" >nul 2>nul
  if errorlevel 1 echo .env>>".gitignore"
)

REM Keep POSTGRES_USER=postgres for compatibility with healthchecks.
call :ensure_kv POSTGRES_USER postgres
call :ensure_kv POSTGRES_DB facilita_v2

REM Replace insecure defaults
call :ensure_kv_if_insecure POSTGRES_PASSWORD postgres 24
call :ensure_kv_if_insecure JWT_ACCESS_SECRET facilita-jwt-access-secret-change-me 32
call :ensure_kv_if_insecure JWT_ACCESS_SECRET your-super-secret-access-key-change-me-in-production 32
call :ensure_kv_if_insecure JWT_REFRESH_SECRET facilita-jwt-refresh-secret-change-me 32
call :ensure_kv_if_insecure JWT_REFRESH_SECRET your-super-secret-refresh-key-change-me-in-production 32

call :ensure_kv JWT_ACCESS_EXPIRES_IN 15m
call :ensure_kv JWT_REFRESH_EXPIRES_IN 7d

call :ensure_kv SUPERADMIN_EMAIL superadmin@facilita.local
call :ensure_kv SUPERADMIN_NAME "Super Admin"
call :ensure_admin_password

REM CORS: default to localhost:80 (adjust to your LAN address if needed)
call :ensure_kv_if_empty CORS_ORIGIN http://localhost:80

call :ensure_kv COOKIE_SECURE false
call :ensure_kv COOKIE_DOMAIN ""
call :ensure_kv NEXT_PUBLIC_API_URL /api
call :ensure_kv NGINX_PORT 80

exit /b

:read_kv
REM Reads the first occurrence of KEY from .env into ENV_CUR (may be empty)
set "ENV_CUR="
for /f "usebackq tokens=1,* delims==" %%A in (`findstr /b /c:"%~1=" "%ENV_PATH%"`) do (
  set "ENV_CUR=%%B"
  goto :read_kv_done
)
:read_kv_done
exit /b

:ensure_kv
REM Ensure KEY exists; if missing, set to DEFAULT
call :read_kv "%~1"
if "%ENV_CUR%"=="" (
  set "ENV_KEY=%~1"
  set "ENV_VALUE=%~2"
  call :set_env
)
exit /b

:ensure_kv_if_empty
REM If KEY missing or empty, set to DEFAULT
call :read_kv "%~1"
if "%ENV_CUR%"=="" (
  set "ENV_KEY=%~1"
  set "ENV_VALUE=%~2"
  call :set_env
)
exit /b

:ensure_kv_if_insecure
REM If KEY missing or equals INSECURE_VALUE, generate random hex with BYTES and set it.
REM Args: KEY INSECURE_VALUE BYTES
call :read_kv "%~1"
if "%ENV_CUR%"=="" goto :gen_insecure
if /i "%ENV_CUR%"=="%~2" goto :gen_insecure
goto :eof

:gen_insecure
set "ENV_KEY=%~1"
for /f "usebackq delims=" %%A in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$bytes=New-Object byte[] %~3; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''"`) do set "ENV_VALUE=%%A"
call :set_env
exit /b

:ensure_admin_password
REM If SUPERADMIN_PASSWORD missing or equals ChangeMe123!, set a URL-safe random password.
call :read_kv SUPERADMIN_PASSWORD
if "%ENV_CUR%"=="" goto :gen_admin
if /i "%ENV_CUR%"=="ChangeMe123!" goto :gen_admin
exit /b

:gen_admin
set "ENV_KEY=SUPERADMIN_PASSWORD"
for /f "usebackq delims=" %%A in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$bytes=New-Object byte[] 24; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); $s=[Convert]::ToBase64String($bytes).TrimEnd('='); $s=$s.Replace('+','-').Replace('/','_'); $s=($s + 'A1'); $s"`) do set "ENV_VALUE=%%A"
call :set_env
exit /b

:set_env
REM Robustly set/replace KEY=VALUE in .env (single occurrence).
powershell -NoProfile -ExecutionPolicy Bypass -Command "$path=$env:ENV_PATH; $key=$env:ENV_KEY; $value=$env:ENV_VALUE; if (-not (Test-Path $path)) { New-Item -ItemType File -Path $path -Force | Out-Null }; $content=Get-Content -Raw -ErrorAction SilentlyContinue $path; if ($null -eq $content) { $content='' }; $nl=[Environment]::NewLine; $lines = $content -split '\r?\n'; $out = New-Object System.Collections.Generic.List[string]; $found=$false; foreach($line in $lines){ if($line -match ('\A' + [regex]::Escape($key) + '=')){ if(-not $found){ $out.Add($key + '=' + $value); $found=$true } } elseif($line -ne ''){ $out.Add($line) } }; if(-not $found){ $out.Add($key + '=' + $value) }; Set-Content -Encoding ascii -Path $path -Value ($out -join $nl)"
set "ENV_CHANGED=1"
echo Atualizado: %ENV_KEY%=%ENV_VALUE%
exit /b
