$Root = $PSScriptRoot

try {
  Start-Service -Name MySQL80 -ErrorAction Stop
  Write-Host "MySQL80 service started successfully."
}
catch {
  Write-Host "Error starting MySQL80 service: $_" -ForegroundColor Red
}

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source

try {
  $backendProcess = Start-Process -FilePath $npm -ArgumentList "run", "server-dev" -WorkingDirectory $Root -PassThru
  Write-Host "Backend process started (PID: $($backendProcess.Id))."
}
catch {
  Write-Host "Error starting backend process: $_" -ForegroundColor Red
}

try {
  $frontendProcess = Start-Process -FilePath $npm -ArgumentList "run", "client" -WorkingDirectory $Root -PassThru
  Write-Host "Frontend process started (PID: $($frontendProcess.Id))."
}
catch {
  Write-Host "Error starting frontend process: $_" -ForegroundColor Red
}

Write-Host "Script execution completed."
