$ErrorActionPreference = "Stop"

$root = Split-Path -Path $MyInvocation.MyCommand.Path -Parent

$serverProcess = Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location `"$root`"; npm run dev"
) -WorkingDirectory $root -PassThru

Start-Sleep -Seconds 3

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location `"$root`"; ngrok http 3000"
) -WorkingDirectory $root
