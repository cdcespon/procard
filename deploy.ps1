# Publica / actualiza la PWA en GitHub Pages (https://cdcespon.github.io/procard/).
# Uso:  deploy.cmd   (doble clic)   o   powershell -ExecutionPolicy Bypass -File .\deploy.ps1 [-Mensaje "..."]
# Requiere git y gh CLI. Usa la cuenta personal @cdcespon.
param(
  [string]$Owner = "cdcespon",
  [string]$Repo = "procard",
  [string]$Mensaje = "update"
)
# Windows PowerShell 5.1 trata la salida por stderr de git/gh como error: no usar "Stop"
# y controlar el código de salida de cada comando.
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$remote = "https://github.com/$Owner/$Repo.git"

function Run([string]$cmd, [switch]$AllowFail) {
  Write-Host "> $cmd" -ForegroundColor DarkGray
  cmd /c "$cmd 2>&1" | ForEach-Object { Write-Host "  $_" }
  if ($LASTEXITCODE -ne 0 -and -not $AllowFail) {
    Write-Host "`nFalló: $cmd (código $LASTEXITCODE)" -ForegroundColor Red
    exit 1
  }
  return $LASTEXITCODE
}

Run "gh auth switch --user $Owner" -AllowFail | Out-Null
Run "gh auth setup-git" | Out-Null          # git usa el token de la cuenta activa de gh

# Nueva versión de caché del service worker en cada deploy (los celulares toman los cambios)
$ver = Get-Date -Format "yyyyMMddHHmmss"
$sw = [IO.File]::ReadAllText("$PSScriptRoot\sw.js")
$sw = $sw -replace "const CACHE = '[^']*';", "const CACHE = 'procard-$ver';"
[IO.File]::WriteAllText("$PSScriptRoot\sw.js", $sw, (New-Object Text.UTF8Encoding $false))

# Crea el repo si no existe
if ((Run "gh repo view $Owner/$Repo" -AllowFail) -ne 0) {
  Run "gh repo create $Owner/$Repo --public" | Out-Null
}

if (-not (Test-Path .git)) {
  Run "git init -b main" | Out-Null
  Run "git remote add origin $remote" | Out-Null
}
Run "git add -A" | Out-Null
Run "git commit -m `"$Mensaje`"" -AllowFail | Out-Null      # sin cambios = no falla
# Esta carpeta manda sobre lo que haya en el repo (README inicial, etc.)
Run "git push -u origin main --force" | Out-Null

# Habilita Pages (si ya estaba habilitado, devuelve error y se ignora)
Run "gh api repos/$Owner/$Repo/pages -X POST -f source[branch]=main -f source[path]=/" -AllowFail | Out-Null

Write-Host "`nListo: https://$Owner.github.io/$Repo/  (Pages tarda ~1 min en reflejar cambios)" -ForegroundColor Green
