# Kakarla Rohith | Cinematic 3D Portfolio

An interactive, cinematic 3D portfolio and live-scored WebGL experience built with Three.js and Web Audio API.

## Project Structure

```text
new folder 1/
├── index.html              # Main HTML markup
├── style.css               # Styling, filmic effects & responsive design
├── script.js               # Three.js 3D world, Web Audio synth & reel controller
├── assets/
│   └── portrait.webp       # Portrait image asset
├── server.ps1              # Lightweight zero-dependency localhost HTTP server (PowerShell)
├── start-server.bat        # One-click Windows launcher (starts server & opens browser)
└── README.md               # Documentation
```

## How to Run on Localhost

### Option 1: One-Click Launcher (Recommended on Windows)
Double-click `start-server.bat`. It will:
1. Start the local server on `http://localhost:8080`.
2. Automatically launch the website in your default browser.

### Option 2: Run via PowerShell
In PowerShell, navigate to this folder and run:
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080
```
Then open `http://localhost:8080/` in your browser.

### Option 3: Python (if installed)
```bash
python -m http.server 8080
```
Then open `http://localhost:8080/`.

### Option 4: Node / npx (if installed)
```bash
npx serve .
```
or
```bash
npx http-server
```

