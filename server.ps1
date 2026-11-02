param(
    [int]$Port = 8080
)

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try {
    $listener.Start()
} catch {
    $Port = 8081
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $listener.Start()
}

$url = "http://localhost:$Port/"
Write-Host ""
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Cinematic Portfolio Server is running!" -ForegroundColor Green
Write-Host " URL: $url" -ForegroundColor Yellow
Write-Host " Press Ctrl+C in this terminal to stop the server." -ForegroundColor Gray
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".webp" = "image/webp"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII)
        $requestLine = $reader.ReadLine()

        if ($requestLine) {
            $tokens = $requestLine.Split(" ")
            if ($tokens.Length -ge 2) {
                $rawPath = $tokens[1]
                $cleanPath = $rawPath.Split("?")[0].TrimStart("/")
                if ([string]::IsNullOrWhiteSpace($cleanPath)) {
                    $cleanPath = "index.html"
                }
                $cleanPath = [Uri]::UnescapeDataString($cleanPath).Replace("/", [System.IO.Path]::DirectorySeparatorChar)
                $fullPath = [System.IO.Path]::Combine($PSScriptRoot, $cleanPath)

                if ([System.IO.File]::Exists($fullPath)) {
                    $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
                    $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
                    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($bytes, 0, $bytes.Length)
                    $stream.Flush()
                } else {
                    $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $cleanPath")
                    $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($msg.Length)`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($msg, 0, $msg.Length)
                    $stream.Flush()
                }
            }
        }
        $client.Close()
    }
} finally {
    $listener.Stop()
}
