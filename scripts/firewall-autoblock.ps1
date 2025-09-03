# Script de PowerShell para auto-bloquear IPs maliciosas en Windows Firewall
# Ejecutar como Administrador

param(
    [string]$LogPath = "C:\Users\Administrator\Desktop\broker\payroll-crypto-api\logs\error.log",
    [int]$CheckInterval = 30,  # Segundos entre cada verificación
    [int]$MaxAttempts = 3      # Máximo de intentos antes de bloquear
)

Write-Host "FIREWALL AUTO-BLOCKER INICIADO" -ForegroundColor Green
Write-Host "Monitoreando: $LogPath" -ForegroundColor Yellow
Write-Host "Intervalo: $CheckInterval segundos" -ForegroundColor Yellow
Write-Host "Max intentos: $MaxAttempts" -ForegroundColor Yellow
Write-Host ""

# Hashtable para trackear IPs y sus intentos
$ipAttempts = @{}
$blockedIPs = @{}

# Función para bloquear IP en firewall
function Block-IP {
    param([string]$IP)
    
    if ($blockedIPs.ContainsKey($IP)) {
        return $false
    }
    
    $ruleName = "AutoBlock_$($IP.Replace('.', '_'))"
    
    try {
        # Verificar si la regla ya existe
        $existingRule = netsh advfirewall firewall show rule name="$ruleName" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "IP $IP ya esta bloqueada" -ForegroundColor Yellow
            $blockedIPs[$IP] = $true
            return $false
        }
        
        # Crear nueva regla de bloqueo
        $result = netsh advfirewall firewall add rule name="$ruleName" `
            dir=in action=block remoteip=$IP `
            description="Auto-blocked suspicious IP - $(Get-Date)" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "BLOQUEADO EN FIREWALL: $IP" -ForegroundColor Red
            $blockedIPs[$IP] = $true
            
            # Log en archivo
            $logEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - FIREWALL BLOCKED: $IP"
            Add-Content -Path "$LogPath.firewall" -Value $logEntry
            
            return $true
        } else {
            Write-Host "Error bloqueando $IP : $result" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Excepcion bloqueando $IP : $_" -ForegroundColor Red
        return $false
    }
}

# Función para analizar logs y detectar IPs sospechosas
function Analyze-Logs {
    if (-not (Test-Path $LogPath)) {
        Write-Host "Archivo de log no encontrado: $LogPath" -ForegroundColor Yellow
        return
    }
    
    # Leer últimas 500 líneas del log
    $lines = Get-Content $LogPath -Tail 500 -ErrorAction SilentlyContinue
    
    foreach ($line in $lines) {
        # Buscar patrones de ataque
        if ($line -match '(BLOCKED|EXPLOIT|SUSPICIOUS|ATTACK|CRITICAL).*?(\d+\.\d+\.\d+\.\d+)') {
            $ip = $matches[2]
            
            # Ignorar IPs locales
            if ($ip -eq "127.0.0.1" -or $ip -eq "::1") {
                continue
            }
            
            # Incrementar contador
            if ($ipAttempts.ContainsKey($ip)) {
                $ipAttempts[$ip]++
            } else {
                $ipAttempts[$ip] = 1
            }
            
            # Verificar si supera el threshold
            if ($ipAttempts[$ip] -ge $MaxAttempts -and -not $blockedIPs.ContainsKey($ip)) {
                Write-Host ""
                $attempts = $ipAttempts[$ip]
                Write-Host "AMENAZA DETECTADA: $ip ($attempts intentos)" -ForegroundColor Red
                Block-IP -IP $ip
            }
        }
        
        # Detectar patrón específico de rate limit
        if ($line -match 'RATE_LIMIT_EXCEEDED.*?(\d+\.\d+\.\d+\.\d+)') {
            $ip = $matches[1]
            if (-not $blockedIPs.ContainsKey($ip)) {
                Write-Host "Rate limit excedido: $ip" -ForegroundColor Yellow
                $ipAttempts[$ip] = $MaxAttempts  # Bloqueo inmediato
                Block-IP -IP $ip
            }
        }
    }
}

# Función para limpiar contadores antiguos (reset cada hora)
function Clear-OldCounters {
    $Script:lastClear = Get-Date
    $ipAttempts.Clear()
    Write-Host "Contadores reseteados - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Cyan
}

# Función para mostrar estadísticas
function Show-Stats {
    $totalBlocked = $blockedIPs.Count
    $totalTracked = $ipAttempts.Count
    
    Write-Host "`nESTADISTICAS:" -ForegroundColor Cyan
    Write-Host "  IPs bloqueadas: $totalBlocked" -ForegroundColor Green
    Write-Host "  IPs monitoreadas: $totalTracked" -ForegroundColor Yellow
    
    if ($ipAttempts.Count -gt 0) {
        Write-Host "  Top amenazas:" -ForegroundColor Yellow
        $ipAttempts.GetEnumerator() | 
            Sort-Object Value -Descending | 
            Select-Object -First 5 |
            ForEach-Object {
                Write-Host "    $($_.Key): $($_.Value) intentos" -ForegroundColor Gray
            }
    }
}

# Bloquear IP conocida del atacante inmediatamente
Write-Host "Bloqueando IP conocida del atacante..." -ForegroundColor Red
Block-IP -IP "103.143.207.222"

# Variables de control
$lastClear = Get-Date
$iterations = 0

# Loop principal
Write-Host "`nMonitoreando logs..." -ForegroundColor Green
Write-Host "Presiona Ctrl+C para detener`n" -ForegroundColor Gray

while ($true) {
    try {
        $iterations++
        
        # Analizar logs
        Analyze-Logs
        
        # Limpiar contadores cada hora
        if ((Get-Date).Subtract($lastClear).TotalMinutes -ge 60) {
            Clear-OldCounters
        }
        
        # Mostrar estadísticas cada 10 iteraciones
        if ($iterations % 10 -eq 0) {
            Show-Stats
        }
        
        # Esperar antes de la siguiente verificación
        Start-Sleep -Seconds $CheckInterval
        
    } catch {
        Write-Host "Error en el loop principal: $_" -ForegroundColor Red
        Start-Sleep -Seconds 5
    }
}