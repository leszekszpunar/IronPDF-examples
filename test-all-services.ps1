# Multi-Platform PDF Services - Automatyczne Testowanie (PowerShell)
# Testuje wszystkie serwisy z użyciem plików z katalogu Data/

param(
  [switch]$Verbose
)

# Konfiguracja
$Services = @(
  @{ Name = "IronPDFService"; Port = 5001 },
  @{ Name = "PdfSharpService"; Port = 5002 },
  @{ Name = "PythonPdfService"; Port = 5003 },
  @{ Name = "NodeJSPdfService"; Port = 5033 },
  @{ Name = "GoPdfService"; Port = 5034 }
)

# Pliki testowe
$TestFiles = @(
  "Data/file-sample_100kB.docx",
  "Data/file-sample_500kB.doc",
  "Data/pexels-jamshed-ahmad-560590-1315655.jpg",
  "Data/pexels-annpeach-15143046.jpg",
  "Data/sample_5184×3456.jpeg"
)

# Funkcje pomocnicze
function Write-ColorOutput {
  param(
    [string]$Message,
    [string]$Color = "White"
  )
  Write-Host $Message -ForegroundColor $Color
}

function Write-Info {
  param([string]$Message)
  Write-ColorOutput "[INFO] $Message" "Cyan"
}

function Write-Success {
  param([string]$Message)
  Write-ColorOutput "[SUCCESS] $Message" "Green"
}

function Write-Warning {
  param([string]$Message)
  Write-ColorOutput "[WARNING] $Message" "Yellow"
}

function Write-Error {
  param([string]$Message)
  Write-ColorOutput "[ERROR] $Message" "Red"
}

# Sprawdź czy pliki testowe istnieją
function Test-TestFiles {
  Write-Info "Sprawdzanie plików testowych..."
    
  foreach ($file in $TestFiles) {
    if (Test-Path $file) {
      Write-Success "Znaleziono: $file"
    }
    else {
      Write-Warning "Brak pliku: $file"
    }
  }
  Write-Host ""
}

# Test health check
function Test-Health {
  param(
    [string]$ServiceName,
    [int]$Port
  )
    
  Write-Info "Testowanie health check dla $ServiceName (port $Port)..."
    
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
      Write-Success "$ServiceName - Health check OK"
      return $true
    }
    else {
      Write-Error "$ServiceName - Health check FAILED (HTTP $($response.StatusCode))"
      return $false
    }
  }
  catch {
    Write-Error "$ServiceName - Health check FAILED"
    return $false
  }
}

# Test supported formats
function Test-SupportedFormats {
  param(
    [string]$ServiceName,
    [int]$Port
  )
    
  Write-Info "Testowanie supported formats dla $ServiceName..."
    
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/pdf/supported-formats" -Method GET -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
      Write-Success "$ServiceName - Supported formats OK"
      return $true
    }
    else {
      Write-Warning "$ServiceName - Supported formats FAILED (HTTP $($response.StatusCode))"
      return $false
    }
  }
  catch {
    Write-Warning "$ServiceName - Supported formats FAILED"
    return $false
  }
}

# Test merge PDFs
function Test-MergePdfs {
  param(
    [string]$ServiceName,
    [int]$Port
  )
    
  Write-Info "Testowanie merge PDFs dla $ServiceName..."
    
  try {
    $form = @{
      files        = @(
        Get-Item "Data/file-sample_100kB.docx",
        Get-Item "Data/file-sample_500kB.doc"
      )
      outputFormat = "A4"
    }
        
    $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/pdf/merge-pdfs" -Method POST -Form $form -TimeoutSec 30 -ErrorAction Stop
        
    if ($response.StatusCode -eq 200) {
      Write-Success "$ServiceName - Merge PDFs OK"
      return $true
    }
    else {
      Write-Warning "$ServiceName - Merge PDFs FAILED (HTTP $($response.StatusCode))"
      return $false
    }
  }
  catch {
    Write-Warning "$ServiceName - Merge PDFs FAILED"
    return $false
  }
}

# Test images to PDF
function Test-ImagesToPdf {
  param(
    [string]$ServiceName,
    [int]$Port
  )
    
  Write-Info "Testowanie images to PDF dla $ServiceName..."
    
  try {
    $form = @{
      files        = @(
        Get-Item "Data/pexels-jamshed-ahmad-560590-1315655.jpg",
        Get-Item "Data/pexels-annpeach-15143046.jpg"
      )
      outputFormat = "A4"
    }
        
    $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/pdf/images-to-pdf" -Method POST -Form $form -TimeoutSec 30 -ErrorAction Stop
        
    if ($response.StatusCode -eq 200) {
      Write-Success "$ServiceName - Images to PDF OK"
      return $true
    }
    else {
      Write-Warning "$ServiceName - Images to PDF FAILED (HTTP $($response.StatusCode))"
      return $false
    }
  }
  catch {
    Write-Warning "$ServiceName - Images to PDF FAILED"
    return $false
  }
}

# Test merge all
function Test-MergeAll {
  param(
    [string]$ServiceName,
    [int]$Port
  )
    
  Write-Info "Testowanie merge all dla $ServiceName..."
    
  try {
    $form = @{
      files        = @(
        Get-Item "Data/file-sample_100kB.docx",
        Get-Item "Data/pexels-jamshed-ahmad-560590-1315655.jpg"
      )
      outputFormat = "A4"
    }
        
    $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/pdf/merge-all" -Method POST -Form $form -TimeoutSec 30 -ErrorAction Stop
        
    if ($response.StatusCode -eq 200) {
      Write-Success "$ServiceName - Merge all OK"
      return $true
    }
    else {
      Write-Warning "$ServiceName - Merge all FAILED (HTTP $($response.StatusCode))"
      return $false
    }
  }
  catch {
    Write-Warning "$ServiceName - Merge all FAILED"
    return $false
  }
}

# Test DOC to PDF (tylko NodeJS i Go)
function Test-DocToPdf {
  param(
    [string]$ServiceName,
    [int]$Port
  )
    
  if ($ServiceName -in @("NodeJSPdfService", "GoPdfService")) {
    Write-Info "Testowanie DOC to PDF dla $ServiceName..."
        
    try {
      $form = @{
        file = Get-Item "Data/file-sample_100kB.docx"
      }
            
      $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/pdf/doc-to-pdf" -Method POST -Form $form -TimeoutSec 30 -ErrorAction Stop
            
      if ($response.StatusCode -eq 200) {
        Write-Success "$ServiceName - DOC to PDF OK"
        return $true
      }
      else {
        Write-Warning "$ServiceName - DOC to PDF FAILED (HTTP $($response.StatusCode))"
        return $false
      }
    }
    catch {
      Write-Warning "$ServiceName - DOC to PDF FAILED"
      return $false
    }
  }
  else {
    Write-Info "$ServiceName - Pomijam test DOC to PDF (nieobsługiwane)"
    return $true
  }
}

# Test add QR code (tylko NodeJS i Go)
function Test-AddQrCode {
  param(
    [string]$ServiceName,
    [int]$Port
  )
    
  if ($ServiceName -in @("NodeJSPdfService", "GoPdfService")) {
    Write-Info "Testowanie add QR code dla $ServiceName..."
        
    try {
      $form = @{
        file = Get-Item "Data/file-sample_100kB.docx"
        text = "https://github.com/example/repo"
      }
            
      $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/pdf/add-qr-code" -Method POST -Form $form -TimeoutSec 30 -ErrorAction Stop
            
      if ($response.StatusCode -eq 200) {
        Write-Success "$ServiceName - Add QR code OK"
        return $true
      }
      else {
        Write-Warning "$ServiceName - Add QR code FAILED (HTTP $($response.StatusCode))"
        return $false
      }
    }
    catch {
      Write-Warning "$ServiceName - Add QR code FAILED"
      return $false
    }
  }
  else {
    Write-Info "$ServiceName - Pomijam test add QR code (nieobsługiwane)"
    return $true
  }
}

# Test add barcode (tylko NodeJS i Go)
function Test-AddBarcode {
  param(
    [string]$ServiceName,
    [int]$Port
  )
    
  if ($ServiceName -in @("NodeJSPdfService", "GoPdfService")) {
    Write-Info "Testowanie add barcode dla $ServiceName..."
        
    try {
      $form = @{
        file = Get-Item "Data/file-sample_100kB.docx"
        text = "987654321"
      }
            
      $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/pdf/add-barcode" -Method POST -Form $form -TimeoutSec 30 -ErrorAction Stop
            
      if ($response.StatusCode -eq 200) {
        Write-Success "$ServiceName - Add barcode OK"
        return $true
      }
      else {
        Write-Warning "$ServiceName - Add barcode FAILED (HTTP $($response.StatusCode))"
        return $false
      }
    }
    catch {
      Write-Warning "$ServiceName - Add barcode FAILED"
      return $false
    }
  }
  else {
    Write-Info "$ServiceName - Pomijam test add barcode (nieobsługiwane)"
    return $true
  }
}

# Test read codes (jeśli pliki testowe istnieją)
function Test-ReadCodes {
  param(
    [string]$ServiceName,
    [int]$Port
  )
    
  if ((Test-Path "test-files/barcode_test.png") -and (Test-Path "test-files/qr_test.png")) {
    if ($ServiceName -in @("NodeJSPdfService", "PythonPdfService", "GoPdfService")) {
      Write-Info "Testowanie read codes dla $ServiceName..."
            
      try {
        $form = @{
          file = Get-Item "test-files/barcode_test.png"
        }
                
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/pdf/read-barcodes" -Method POST -Form $form -TimeoutSec 30 -ErrorAction Stop
                
        if ($response.StatusCode -eq 200) {
          Write-Success "$ServiceName - Read codes OK"
          return $true
        }
        else {
          Write-Warning "$ServiceName - Read codes FAILED (HTTP $($response.StatusCode))"
          return $false
        }
      }
      catch {
        Write-Warning "$ServiceName - Read codes FAILED"
        return $false
      }
    }
    else {
      Write-Info "$ServiceName - Pomijam test read codes (nieobsługiwane)"
      return $true
    }
  }
  else {
    Write-Info "Pomijam test read codes (brak plików testowych)"
    return $true
  }
}

# Test digital signatures (tylko NodeJS i Go)
function Test-DigitalSignatures {
  param(
    [string]$ServiceName,
    [int]$Port
  )
    
  if ($ServiceName -in @("NodeJSPdfService", "GoPdfService")) {
    Write-Info "Testowanie digital signatures dla $ServiceName..."
        
    try {
      $form = @{
        file = Get-Item "Data/file-sample_100kB.docx"
      }
            
      $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/pdf/sign" -Method POST -Form $form -TimeoutSec 30 -ErrorAction Stop
            
      if ($response.StatusCode -eq 200) {
        Write-Success "$ServiceName - Digital signatures OK"
        return $true
      }
      else {
        Write-Warning "$ServiceName - Digital signatures FAILED (HTTP $($response.StatusCode))"
        return $false
      }
    }
    catch {
      Write-Warning "$ServiceName - Digital signatures FAILED"
      return $false
    }
  }
  else {
    Write-Info "$ServiceName - Pomijam test digital signatures (nieobsługiwane)"
    return $true
  }
}

# Test pojedynczego serwisu
function Test-Service {
  param(
    [hashtable]$Service
  )
    
  $serviceName = $Service.Name
  $port = $Service.Port
    
  Write-Host "========================================"
  Write-Info "Testowanie serwisu: $serviceName (port $port)"
  Write-Host "========================================"
    
  $totalTests = 0
  $passedTests = 0
    
  # Health check
  $totalTests++
  if (Test-Health $serviceName $port) { $passedTests++ }
    
  # Supported formats
  $totalTests++
  if (Test-SupportedFormats $serviceName $port) { $passedTests++ }
    
  # Merge PDFs
  $totalTests++
  if (Test-MergePdfs $serviceName $port) { $passedTests++ }
    
  # Images to PDF
  $totalTests++
  if (Test-ImagesToPdf $serviceName $port) { $passedTests++ }
    
  # Merge all
  $totalTests++
  if (Test-MergeAll $serviceName $port) { $passedTests++ }
    
  # DOC to PDF
  $totalTests++
  if (Test-DocToPdf $serviceName $port) { $passedTests++ }
    
  # Add QR code
  $totalTests++
  if (Test-AddQrCode $serviceName $port) { $passedTests++ }
    
  # Add barcode
  $totalTests++
  if (Test-AddBarcode $serviceName $port) { $passedTests++ }
    
  # Read codes
  $totalTests++
  if (Test-ReadCodes $serviceName $port) { $passedTests++ }
    
  # Digital signatures
  $totalTests++
  if (Test-DigitalSignatures $serviceName $port) { $passedTests++ }
    
  Write-Host ""
  Write-Info "Wyniki dla $serviceName`: $passedTests/$totalTests testów przeszło"
    
  if ($passedTests -eq $totalTests) {
    Write-Success "$serviceName - WSZYSTKIE TESTY PRZESZŁY"
  }
  else {
    Write-Warning "$serviceName - NIEKTÓRE TESTY NIE PRZESZŁY"
  }
    
  Write-Host ""
  return ($passedTests -eq $totalTests)
}

# Główna funkcja
function Main {
  Write-Host "========================================"
  Write-Host "Multi-Platform PDF Services - Test Suite"
  Write-Host "========================================"
  Write-Host ""
    
  # Sprawdź pliki testowe
  Test-TestFiles
    
  $totalServices = 0
  $workingServices = 0
  $failedServices = 0
    
  # Testuj każdy serwis
  foreach ($service in $Services) {
    $totalServices++
        
    if (Test-Service $service) {
      $workingServices++
    }
    else {
      $failedServices++
    }
  }
    
  Write-Host "========================================"
  Write-Host "PODSUMOWANIE TESTÓW"
  Write-Host "========================================"
  Write-Info "Łącznie serwisów: $totalServices"
  Write-Success "Działające serwisy: $workingServices"
    
  if ($failedServices -gt 0) {
    Write-Error "Niedziałające serwisy: $failedServices"
  }
  else {
    Write-Success "Wszystkie serwisy działają poprawnie!"
  }
    
  Write-Host ""
  Write-Info "Aby uruchomić serwisy, użyj: docker compose up -d"
  Write-Info "Aby sprawdzić logi: docker compose logs -f [service-name]"
  Write-Host ""
}

# Uruchom główną funkcję
Main 