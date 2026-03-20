# Dieses Script als Administrator ausfuehren!
# Registriert DuckDNS Auto-Update alle 5 Minuten im Task Scheduler

$scriptPath = "$PSScriptRoot\duckdns-update.ps1"

$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -Once -At (Get-Date)
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName "DuckDNS Biathlon Update" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force

Write-Host "Task registriert. DuckDNS wird alle 5 Minuten aktualisiert."
