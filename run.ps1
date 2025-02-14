try {
  Start-Service -Name MySQL80 -ErrorAction Stop
  Write-Host "MySQL80 service started successfully."
}
catch {
  Write-Host "Error starting MySQL80 service: $_" -ForegroundColor Red
}

try {
  $backendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "server-dev" -PassThru
  Write-Host "Backend process started (PID: $($backendProcess.Id))."
}
catch {
  Write-Host "Error starting backend process: $_" -ForegroundColor Red
}

try {
  $backendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "client" -PassThru
  Write-Host "Frontend process started in the background (PID: $($backendProcess.Id))."
}
catch {
  Write-Host "Error starting frontend process: $_" -ForegroundColor Red
}

Write-Host "Script execution completed."