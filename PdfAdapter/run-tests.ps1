#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Skrypt do uruchamiania testów porównawczych serwisów PDF

.DESCRIPTION
    Uruchamia wszystkie serwisy PDF i wykonuje testy porównawcze wydajności i jakości

.PARAMETER Services
    Lista serwisów do przetestowania (domyślnie: IronPDF, PdfSharp, Python)

.PARAMETER OutputDir
    Katalog do zapisu wyników testów (domyślnie: ./test-results)

.PARAMETER TestFiles
    Katalog z plikami testowymi (domyślnie: ./test-files)

.EXAMPLE
    .\run-tests.ps1

.EXAMPLE
    .\run-tests.ps1 -Services "IronPDF","PdfSharp" -OutputDir "./my-results"
#>

param(
  [string[]]$Services = @("IronPDF", "PdfSharp", "Python"),
  [string]$OutputDir = "./test-results",
  [string]$TestFiles = "./test-files"
)

# Konfiguracja
$ServiceConfigs = @{
  "IronPDF"  = @{
    Port        = 5001
    Path        = "../IronPDFService"
    DockerImage = "ironpdf-service"
  }
  "PdfSharp" = @{
    Port        = 5002
    Path        = "../PdfSharpService"
    DockerImage = "pdfsharp-service"
  }
  "Python"   = @{
    Port        = 5003
    Path        = "../PythonPdfService"
    DockerImage = "python-pdf-service"
  }
}

# Kolory dla output
$Colors = @{
  Success = "Green"
  Error   = "Red"
  Warning = "Yellow"
  Info    = "Cyan"
  Header  = "Magenta"
}

function Write-ColorOutput {
  param(
    [string]$Message,
    [string]$Color = "White"
  )
  Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Test-Port {
  param([int]$Port)
  try {
    $connection = New-Object System.Net.Sockets.TcpClient
    $connection.Connect("localhost", $Port)
    $connection.Close()
    return $true
  }
  catch {
    return $false
  }
}

function Wait-ForService {
  param(
    [string]$ServiceName,
    [int]$Port,
    [int]$TimeoutSeconds = 30
  )
    
  Write-ColorOutput "⏳ Oczekiwanie na uruchomienie $ServiceName na porcie $Port..." "Info"
    
  $startTime = Get-Date
  while ((Get-Date) -lt $startTime.AddSeconds($TimeoutSeconds)) {
    if (Test-Port -Port $Port) {
      Write-ColorOutput "✅ $ServiceName jest gotowy!" "Success"
      return $true
    }
    Start-Sleep -Seconds 2
  }
    
  Write-ColorOutput "❌ Timeout oczekiwania na $ServiceName" "Error"
  return $false
}

function Start-Service {
  param([string]$ServiceName)
    
  $config = $ServiceConfigs[$ServiceName]
  if (-not $config) {
    Write-ColorOutput "❌ Nieznany serwis: $ServiceName" "Error"
    return $false
  }
    
  Write-ColorOutput "🚀 Uruchamianie $ServiceName..." "Header"
    
  try {
    # Sprawdź czy serwis już działa
    if (Test-Port -Port $config.Port) {
      Write-ColorOutput "ℹ️ $ServiceName już działa na porcie $($config.Port)" "Warning"
      return $true
    }
        
    # Uruchom serwis przez Docker Compose
    $composeFile = "../docker-compose.yml"
    if (Test-Path $composeFile) {
      Write-ColorOutput "🐳 Uruchamianie $ServiceName przez Docker Compose..." "Info"
      docker-compose -f $composeFile up -d $($ServiceName.ToLower())
            
      if (Wait-ForService -ServiceName $ServiceName -Port $config.Port) {
        return $true
      }
    }
        
    # Alternatywnie, uruchom bezpośrednio przez dotnet
    if (Test-Path $config.Path) {
      Write-ColorOutput "🔧 Uruchamianie $ServiceName przez dotnet..." "Info"
      $env:ASPNETCORE_URLS = "http://localhost:$($config.Port)"
      Start-Process -FilePath "dotnet" -ArgumentList "run" -WorkingDirectory $config.Path -WindowStyle Hidden
            
      if (Wait-ForService -ServiceName $ServiceName -Port $config.Port) {
        return $true
      }
    }
        
    Write-ColorOutput "❌ Nie udało się uruchomić $ServiceName" "Error"
    return $false
  }
  catch {
    Write-ColorOutput "❌ Błąd podczas uruchamiania $ServiceName: $($_.Exception.Message)" "Error"
    return $false
  }
}

function Stop-Service {
  param([string]$ServiceName)
    
  $config = $ServiceConfigs[$ServiceName]
  if (-not $config) { return }
    
  Write-ColorOutput "🛑 Zatrzymywanie $ServiceName..." "Info"
    
  try {
    # Zatrzymaj przez Docker Compose
    $composeFile = "../docker-compose.yml"
    if (Test-Path $composeFile) {
      docker-compose -f $composeFile stop $($ServiceName.ToLower())
    }
        
    # Zatrzymaj procesy na porcie
    $processes = Get-NetTCPConnection -LocalPort $config.Port -ErrorAction SilentlyContinue | 
    ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue }
        
    foreach ($process in $processes) {
      if ($process.ProcessName -like "*dotnet*" -or $process.ProcessName -like "*python*") {
        Stop-Process -Id $process.Id -Force
      }
    }
  }
  catch {
    Write-ColorOutput "⚠️ Błąd podczas zatrzymywania $ServiceName: $($_.Exception.Message)" "Warning"
  }
}

function Test-ServiceHealth {
  param([string]$ServiceName)
    
  $config = $ServiceConfigs[$ServiceName]
  $url = "http://localhost:$($config.Port)/health"
    
  try {
    $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 10
    Write-ColorOutput "✅ $ServiceName: $($response.status)" "Success"
    return $true
  }
  catch {
    Write-ColorOutput "❌ $ServiceName: Błąd - $($_.Exception.Message)" "Error"
    return $false
  }
}

function Run-PerformanceTest {
  param(
    [string]$ServiceName,
    [string]$Endpoint,
    [string]$TestFile
  )
    
  $config = $ServiceConfigs[$ServiceName]
  $url = "http://localhost:$($config.Port)$Endpoint"
    
  try {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
    $form = @{
      files = Get-Item $TestFile
    }
        
    $response = Invoke-RestMethod -Uri $url -Method Post -Form $form -TimeoutSec 60
        
    $stopwatch.Stop()
        
    $result = @{
      Service      = $ServiceName
      Endpoint     = $Endpoint
      Success      = $true
      ResponseTime = $stopwatch.Elapsed
      FileSize     = $response.Length
    }
        
    Write-ColorOutput "  ✅ $ServiceName: $($stopwatch.Elapsed.TotalMilliseconds)ms, $($response.Length) bytes" "Success"
    return $result
  }
  catch {
    Write-ColorOutput "  ❌ $ServiceName: $($_.Exception.Message)" "Error"
    return @{
      Service  = $ServiceName
      Endpoint = $Endpoint
      Success  = $false
      Error    = $_.Exception.Message
    }
  }
}

function Save-TestResults {
  param(
    [string]$TestName,
    [array]$Results
  )
    
  $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $filename = Join-Path $OutputDir "test_${TestName}_${timestamp}.json"
    
  $Results | ConvertTo-Json -Depth 10 | Out-File -FilePath $filename -Encoding UTF8
    
  Write-ColorOutput "📊 Wyniki zapisane w: $filename" "Info"
}

# Główna logika
Write-ColorOutput "=== TESTY PORÓWNAWCZE SERWISÓW PDF ===" "Header"
Write-ColorOutput "Data: $(Get-Date)" "Info"
Write-ColorOutput "Serwisy: $($Services -join ', ')" "Info"
Write-ColorOutput "Katalog wyników: $OutputDir" "Info"
Write-ColorOutput ""

# Utwórz katalog wyników
if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Sprawdź pliki testowe
if (-not (Test-Path $TestFiles)) {
  Write-ColorOutput "⚠️ Katalog plików testowych nie istnieje: $TestFiles" "Warning"
  Write-ColorOutput "   Utworzę przykładowe pliki testowe..." "Info"
    
  New-Item -ItemType Directory -Path $TestFiles -Force | Out-Null
    
  # Utwórz przykładowy plik PDF
  $samplePdf = Join-Path $TestFiles "sample.pdf"
  [System.Text.Encoding]::UTF8.GetBytes("%PDF-1.4`n1 0 obj`n<<`n/Type /Catalog`n/Pages 2 0 R`n>>`nendobj`n") | Out-File -FilePath $samplePdf -Encoding Byte
    
  # Utwórz przykładowy plik obrazu
  $sampleImage = Join-Path $TestFiles "sample.jpg"
  [System.Text.Encoding]::UTF8.GetBytes("fake-jpeg-data") | Out-File -FilePath $sampleImage -Encoding Byte
}

# Uruchom serwisy
$runningServices = @()
foreach ($service in $Services) {
  if (Start-Service -ServiceName $service) {
    $runningServices += $service
  }
}

if ($runningServices.Count -eq 0) {
  Write-ColorOutput "❌ Nie udało się uruchomić żadnego serwisu" "Error"
  exit 1
}

Write-ColorOutput ""
Write-ColorOutput "=== SPRAWDZANIE ZDROWIA SERWISÓW ===" "Header"
foreach ($service in $runningServices) {
  Test-ServiceHealth -ServiceName $service
}

Write-ColorOutput ""
Write-ColorOutput "=== TESTY WYDAJNOŚCI ===" "Header"

# Test łączenia PDF
Write-ColorOutput "📄 Test łączenia PDF..." "Info"
$mergeResults = @()
$samplePdf = Join-Path $TestFiles "sample.pdf"
foreach ($service in $runningServices) {
  $result = Run-PerformanceTest -ServiceName $service -Endpoint "/api/pdf/merge" -TestFile $samplePdf
  $mergeResults += $result
}
Save-TestResults -TestName "pdf_merge" -Results $mergeResults

# Test konwersji obrazów
Write-ColorOutput "🖼️ Test konwersji obrazów..." "Info"
$imageResults = @()
$sampleImage = Join-Path $TestFiles "sample.jpg"
foreach ($service in $runningServices) {
  $result = Run-PerformanceTest -ServiceName $service -Endpoint "/api/pdf/images-to-pdf" -TestFile $sampleImage
  $imageResults += $result
}
Save-TestResults -TestName "image_conversion" -Results $imageResults

# Test ekstrakcji tekstu (tylko dla obsługujących)
Write-ColorOutput "📝 Test ekstrakcji tekstu..." "Info"
$textResults = @()
$servicesWithTextExtraction = @("IronPDF", "Python")
foreach ($service in $runningServices | Where-Object { $servicesWithTextExtraction -contains $_ }) {
  $result = Run-PerformanceTest -ServiceName $service -Endpoint "/api/pdf/extract-text" -TestFile $samplePdf
  $textResults += $result
}
Save-TestResults -TestName "text_extraction" -Results $textResults

Write-ColorOutput ""
Write-ColorOutput "=== PODSUMOWANIE ===" "Header"

# Analiza wyników
$allResults = $mergeResults + $imageResults + $textResults
$summary = @{}

foreach ($service in $runningServices) {
  $serviceResults = $allResults | Where-Object { $_.Service -eq $service -and $_.Success }
    
  $summary[$service] = @{
    TotalTests          = ($allResults | Where-Object { $_.Service -eq $service }).Count
    SuccessfulTests     = $serviceResults.Count
    AverageResponseTime = if ($serviceResults.Count -gt 0) { 
      [TimeSpan]::FromMilliseconds(($serviceResults | ForEach-Object { $_.ResponseTime.TotalMilliseconds } | Measure-Object -Average).Average)
    }
    else { [TimeSpan]::Zero }
    TotalFileSize       = ($serviceResults | ForEach-Object { $_.FileSize } | Measure-Object -Sum).Sum
  }
}

# Wyświetl podsumowanie
foreach ($service in $runningServices) {
  $stats = $summary[$service]
  Write-ColorOutput "$service:" "Header"
  Write-ColorOutput "  Testy: $($stats.SuccessfulTests)/$($stats.TotalTests) udanych" "Info"
  Write-ColorOutput "  Średni czas odpowiedzi: $($stats.AverageResponseTime.TotalMilliseconds)ms" "Info"
  Write-ColorOutput "  Łączny rozmiar plików: $($stats.TotalFileSize) bytes" "Info"
}

# Zapisz podsumowanie
$summaryFile = Join-Path $OutputDir "summary_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$summary | ConvertTo-Json -Depth 10 | Out-File -FilePath $summaryFile -Encoding UTF8
Write-ColorOutput "📊 Podsumowanie zapisane w: $summaryFile" "Info"

# Zatrzymaj serwisy
Write-ColorOutput ""
Write-ColorOutput "=== ZATRZYMYWANIE SERWISÓW ===" "Header"
foreach ($service in $runningServices) {
  Stop-Service -ServiceName $service
}

Write-ColorOutput ""
Write-ColorOutput "✅ Testy zakończone!" "Success" 