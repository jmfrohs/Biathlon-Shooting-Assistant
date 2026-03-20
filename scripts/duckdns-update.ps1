# DuckDNS Auto-Update Script
# Dein DuckDNS Token eintragen (von duckdns.org -> Dein Account oben)
$TOKEN = "858d2b0b-3a67-4976-b089-233e7fbb55f2"
$DOMAIN = "biathlon-shooting-assistant"

$url = "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip="
$response = Invoke-WebRequest -Uri $url -UseBasicParsing
Write-Host "DuckDNS Update: $($response.Content) - $(Get-Date)"
