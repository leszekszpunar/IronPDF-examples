#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Skrypt do testowania wydajności serwisów PDF

.DESCRIPTION
    Automatycznie testuje wszystkie serwisy PDF i generuje raport porównawczy
    z czasami odpowiedzi, rozmiarami plików i jakością wyników.

.PARAMETER Services
    Lista serwisów do przetestowania (domyślnie: wszystkie)

.PARAMETER Iterations
    Liczba iteracji testów (domyślnie: 5)

.PARAMETER OutputDir
    Katalog wyjściowy dla wyników (domyślnie: ./test-results)

.EXAMPLE
    .\test-performance.ps1
    .\test-performance.ps1 -Services "ironpdf","pdfsharp" -Iterations 10
#>

param(
  [string[]]$Services = @("ironpdf", "pdfsharp", "python"),
  [int]$Iterations = 5,
  [string]$OutputDir = "./test-results"
)

# Konfiguracja serwisów
$ServiceConfig = @{
  "ironpdf"  = @{
    Name    = "IronPDF Service"
    BaseUrl = "http://localhost:5001"
    Port    = 5001
  }
  "pdfsharp" = @{
    Name    = "PdfSharp Service"
    BaseUrl = "http://localhost:5002"
    Port    = 5002
  }
  "python"   = @{
    Name    = "Python PDF Service"
    BaseUrl = "http://localhost:5003"
    Port    = 5003
  }
}

# Pliki testowe
$TestFiles = @{
  "pdfs"   = @("test-files/sample1.pdf", "test-files/sample2.pdf")
  "images" = @("test-files/sample1.jpg", "test-files/sample2.png")
  "mixed"  = @{
    "pdfs"   = @("test-files/sample1.pdf")
    "images" = @("test-files/sample1.jpg", "test-files/sample2.png")
  }
}

# Endpointy do testowania
$Endpoints = @(
  @{
    Name    = "Merge PDFs"
    Path    = "/api/pdf/merge"
    Method  = "POST"
    Files   = $TestFiles.pdfs
    FileKey = "files"
  },
  @{
    Name    = "Convert Images to PDF"
    Path    = "/api/pdf/convert-images"
    Method  = "POST"
    Files   = $TestFiles.images
    FileKey = "files"
  },
  @{
    Name    = "Merge PDFs and Images"
    Path    = "/api/pdf/merge-pdfs-and-images"
    Method  = "POST"
    Files   = $TestFiles.mixed
    FileKey = @{
      "pdfFiles"   = $TestFiles.mixed.pdfs
      "imageFiles" = $TestFiles.mixed.images
    }
  },
  @{
    Name    = "Extract Text"
    Path    = "/api/pdf/extract-text"
    Method  = "POST"
    Files   = @("test-files/sample1.pdf")
    FileKey = "file"
  }
)

# Funkcje pomocnicze
function Write-ColorOutput {
  param(
    [string]$Message,
    [string]$Color = "White"
  )
  Write-Host $Message -ForegroundColor $Color
}

function Test-ServiceHealth {
  param(
    [string]$ServiceName,
    [string]$BaseUrl
  )
    
  try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
    return $response.StatusCode -eq 200
  }
  catch {
    return $false
  }
}

function Invoke-PdfTest {
  param(
    [string]$ServiceName,
    [string]$BaseUrl,
    [hashtable]$Endpoint,
    [int]$Iteration
  )
    
  $startTime = Get-Date
  $result = @{
    Service   = $ServiceName
    Endpoint  = $Endpoint.Name
    Iteration = $Iteration
    Success   = $false
    Duration  = 0
    FileSize  = 0
    Error     = $null
  }
    
  try {
    # Przygotowanie form data
    $form = @{}
        
    if ($Endpoint.FileKey -is [hashtable]) {
      # Wiele kluczy (np. pdfFiles i imageFiles)
      foreach ($key in $Endpoint.FileKey.Keys) {
        $form[$key] = Get-ChildItem $Endpoint.FileKey[$key] | ForEach-Object { $_.FullName }
      }
    }
    else {
      # Pojedynczy klucz
      $form[$Endpoint.FileKey] = Get-ChildItem $Endpoint.Files | ForEach-Object { $_.FullName }
    }
        
    # Wywołanie API
    $response = Invoke-WebRequest -Uri "$BaseUrl$($Endpoint.Path)" -Method $Endpoint.Method -Form $form -TimeoutSec 60
        
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
        
    $result.Success = $true
    $result.Duration = $duration
    $result.FileSize = $response.Content.Length
        
    # Zapisz wynik do pliku
    $outputFile = Join-Path $OutputDir "$($ServiceName)_$($Endpoint.Name)_$($Iteration).pdf"
    [System.IO.File]::WriteAllBytes($outputFile, $response.Content)
        
    Write-ColorOutput "  ✓ $($Endpoint.Name) - $([math]::Round($duration, 2))ms - $($response.Content.Length) bytes" "Green"
  }
  catch {
    $result.Error = $_.Exception.Message
    Write-ColorOutput "  ✗ $($Endpoint.Name) - ERROR: $($_.Exception.Message)" "Red"
  }
    
  return $result
}

# Główna logika
Write-ColorOutput "🚀 Rozpoczynam testowanie wydajności serwisów PDF" "Cyan"
Write-ColorOutput "================================================" "Cyan"

# Sprawdź czy serwisy są uruchomione
Write-ColorOutput "`n🔍 Sprawdzanie dostępności serwisów..." "Yellow"

$availableServices = @()
foreach ($service in $Services) {
  if ($ServiceConfig.ContainsKey($service)) {
    $config = $ServiceConfig[$service]
    $isHealthy = Test-ServiceHealth -ServiceName $service -BaseUrl $config.BaseUrl
        
    if ($isHealthy) {
      Write-ColorOutput "  ✓ $($config.Name) - DOSTĘPNY" "Green"
      $availableServices += $service
    }
    else {
      Write-ColorOutput "  ✗ $($config.Name) - NIEDOSTĘPNY" "Red"
    }
  }
}

if ($availableServices.Count -eq 0) {
  Write-ColorOutput "`n❌ Żaden z serwisów nie jest dostępny!" "Red"
  Write-ColorOutput "Uruchom serwisy używając: docker-compose up -d" "Yellow"
  exit 1
}

# Utwórz katalog wyników
if (!(Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Wykonaj testy
$allResults = @()

Write-ColorOutput "`n📊 Wykonywanie testów wydajności..." "Yellow"

foreach ($service in $availableServices) {
  $config = $ServiceConfig[$service]
  Write-ColorOutput "`n🔧 Testowanie: $($config.Name)" "Cyan"
    
  foreach ($endpoint in $Endpoints) {
    Write-ColorOutput "  📍 $($endpoint.Name):" "White"
        
    for ($i = 1; $i -le $Iterations; $i++) {
      $result = Invoke-PdfTest -ServiceName $service -BaseUrl $config.BaseUrl -Endpoint $endpoint -Iteration $i
      $allResults += $result
            
      # Krótka przerwa między testami
      Start-Sleep -Milliseconds 100
    }
  }
}

# Analiza wyników
Write-ColorOutput "`n📈 Analiza wyników..." "Yellow"

$summary = @{}

foreach ($service in $availableServices) {
  $summary[$service] = @{}
    
  foreach ($endpoint in $Endpoints) {
    $serviceResults = $allResults | Where-Object { $_.Service -eq $service -and $_.Endpoint -eq $endpoint.Name -and $_.Success }
        
    if ($serviceResults.Count -gt 0) {
      $avgDuration = ($serviceResults | Measure-Object -Property Duration -Average).Average
      $avgFileSize = ($serviceResults | Measure-Object -Property FileSize -Average).Average
      $successRate = ($serviceResults.Count / $Iterations) * 100
            
      $summary[$service][$endpoint.Name] = @{
        AvgDuration = $avgDuration
        AvgFileSize = $avgFileSize
        SuccessRate = $successRate
        TotalTests  = $serviceResults.Count
      }
    }
  }
}

# Wyświetl podsumowanie
Write-ColorOutput "`n📊 PODSUMOWANIE WYNIKÓW" "Cyan"
Write-ColorOutput "=====================" "Cyan"

foreach ($service in $availableServices) {
  $config = $ServiceConfig[$service]
  Write-ColorOutput "`n🏆 $($config.Name)" "Yellow"
    
  foreach ($endpoint in $Endpoints) {
    if ($summary[$service].ContainsKey($endpoint.Name)) {
      $stats = $summary[$service][$endpoint.Name]
      Write-ColorOutput "  📍 $($endpoint.Name):" "White"
      Write-ColorOutput "    ⏱️  Średni czas: $([math]::Round($stats.AvgDuration, 2))ms" "Green"
      Write-ColorOutput "    📄 Średni rozmiar: $([math]::Round($stats.AvgFileSize / 1KB, 2))KB" "Blue"
      Write-ColorOutput "    ✅ Skuteczność: $([math]::Round($stats.SuccessRate, 1))%" "Cyan"
    }
    else {
      Write-ColorOutput "  ❌ $($endpoint.Name): BRAK SUKCESÓW" "Red"
    }
  }
}

# Zapisz szczegółowe wyniki do pliku
$resultsFile = Join-Path $OutputDir "detailed-results.json"
$allResults | ConvertTo-Json -Depth 3 | Out-File -FilePath $resultsFile -Encoding UTF8

$summaryFile = Join-Path $OutputDir "summary.json"
$summary | ConvertTo-Json -Depth 3 | Out-File -FilePath $summaryFile -Encoding UTF8

Write-ColorOutput "`n💾 Szczegółowe wyniki zapisane w:" "Yellow"
Write-ColorOutput "  📄 $resultsFile" "White"
Write-ColorOutput "  📄 $summaryFile" "White"

Write-ColorOutput "`n✅ Testowanie zakończone!" "Green" 