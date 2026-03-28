Write-Host "Iniciando Docker Desktop..."
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
Write-Host "Aguardando Docker ficar pronto..."
$timeout = 60 # segundos
$elapsed = 0
while ($elapsed -lt $timeout) {
    $error.Clear()
    # Executa um comando docker básico para ver se responde
    docker version > $null 2>&1
    if ($?) {
        Write-Host "Docker está pronto!"
        break
    }
    Start-Sleep -Seconds 2
    $elapsed += 2
}
if ($elapsed -ge $timeout) {
    Write-Host "Erro: Timeout de 60s esperando Docker"
    Exit 1
}

Write-Host "Iniciando Build..."
docker build -t tiobred/verbalia:latest .
if (-not $?) { Write-Host "Build falhou"; Exit 1 }

Write-Host "Iniciando Push..."
docker push tiobred/verbalia:latest
if (-not $?) { Write-Host "Push falhou"; Exit 1 }

Write-Host "Processo concluído com sucesso!"
