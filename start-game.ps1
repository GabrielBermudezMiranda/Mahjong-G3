#!/usr/bin/env pwsh
# Script para iniciar el servidor y cliente de Mahjong Online

Write-Host "🀄 Iniciando Mahjong Online..." -ForegroundColor Cyan
Write-Host ""

# Verificar si ambas carpetas existen
$serverPath = "./mahjong-coop/server"
$clientPath = "./remix_-mahjong-solitario-tortuga"

if (-not (Test-Path $serverPath)) {
    Write-Host "❌ La carpeta del servidor no existe: $serverPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $clientPath)) {
    Write-Host "❌ La carpeta del cliente no existe: $clientPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Carpetas verificadas" -ForegroundColor Green
Write-Host ""

# Iniciar el servidor
Write-Host "📦 Iniciando servidor en puerto 3000..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$serverPath`" && npm.cmd run dev"

# Esperar a que el servidor inicie
Start-Sleep -Seconds 3

# Iniciar el cliente
Write-Host "🌐 Iniciando cliente en puerto 5173..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$clientPath`" && npm.cmd run dev"

Write-Host ""
Write-Host "✅ El servidor está corriendo en http://localhost:3000" -ForegroundColor Green
Write-Host "✅ El cliente está corriendo en http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Abre http://localhost:5173 en tu navegador para jugar" -ForegroundColor Cyan
Read-Host "Presiona Enter para dejar las terminales abiertas..."
