$ErrorActionPreference = 'Stop'
$entry = Join-Path $PSScriptRoot 'chat-rat-20261016.mjs'
$url = 'http://127.0.0.1:43127'
try { $response = Invoke-WebRequest $url -TimeoutSec 2; $running = $response.Content -match '<title>Chat Rat' } catch { $running = $false }
if (-not $running) {
    $node = (Get-Command node -ErrorAction Stop).Source
    Start-Process -FilePath $node -ArgumentList @('"' + $entry + '"', 'serve') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 300
        try { $response = Invoke-WebRequest $url -TimeoutSec 1; if ($response.Content -match '<title>Chat Rat') { $ready = $true; break } } catch {}
    }
    if (-not $ready) { throw 'Chat Rat could not start. Check whether port 43127 is already in use.' }
}
Start-Process $url
