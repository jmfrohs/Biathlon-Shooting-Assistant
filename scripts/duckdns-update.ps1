# DuckDNS Auto-Update Script
# Dein DuckDNS Token eintragen (von duckdns.org -> Dein Account oben)
$TOKEN = "DEIN-TOKEN-HIER"
$DOMAIN = "biathlo-shooting-assistant"

$url = "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip="
$response = Invoke-WebRequest -Uri $url -UseBasicParsing
Write-Host "DuckDNS Update: $($response.Content) - $(Get-Date)"
