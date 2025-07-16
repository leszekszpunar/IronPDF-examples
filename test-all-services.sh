#!/bin/bash

# Multi-Platform PDF Services - Automatyczne Testowanie
# Testuje wszystkie serwisy z użyciem plików z katalogu Data/

set -e

# Kolory dla output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfiguracja
SERVICES=(
    "IronPDFService:5001"
    "PdfSharpService:5002"
    "PythonPdfService:5003"
    "NodeJSPdfService:5033"
    "GoPdfService:5034"
)

# Pliki testowe
TEST_FILES=(
    "Data/file-sample_100kB.docx"
    "Data/file-sample_500kB.doc"
    "Data/pexels-jamshed-ahmad-560590-1315655.jpg"
    "Data/pexels-annpeach-15143046.jpg"
    "Data/sample_5184×3456.jpeg"
)

# Funkcje pomocnicze
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# --- Nowa logika: automatyczne uruchamianie docker compose ---
health_check() {
    local port=$1
    curl -s -f "http://localhost:$port/health" > /dev/null 2>&1
}

all_services_healthy() {
    local all_ok=0
    for entry in "${SERVICES[@]}"; do
        local port=$(echo $entry | cut -d: -f2)
        if ! health_check "$port"; then
            all_ok=1
            break
        fi
    done
    return $all_ok
}

wait_for_services() {
    local max_retries=30
    local delay=2
    local attempt=1
    while (( attempt <= max_retries )); do
        if all_services_healthy; then
            log_success "Wszystkie serwisy są gotowe."
            return 0
        else
            log_info "Oczekiwanie na gotowość serwisów (próba $attempt/$max_retries)..."
            sleep $delay
        fi
        ((attempt++))
    done
    log_error "Serwisy nie są gotowe po $((max_retries * delay)) sekundach."
    exit 1
}

log_info "Sprawdzanie dostępności serwisów..."
if ! all_services_healthy; then
    log_warning "Nie wszystkie serwisy są uruchomione. Uruchamiam docker compose..."
    docker compose up -d
    wait_for_services
else
    log_success "Wszystkie serwisy są już uruchomione."
fi

# --- Dalej: oryginalna logika testów ---

# Sprawdź czy pliki testowe istnieją
check_test_files() {
    log_info "Sprawdzanie plików testowych..."
    
    for file in "${TEST_FILES[@]}"; do
        if [[ -f "$file" ]]; then
            log_success "Znaleziono: $file"
        else
            log_warning "Brak pliku: $file"
        fi
    done
    echo
}

# Test health check
test_health() {
    local service_name=$1
    local port=$2
    
    log_info "Testowanie health check dla $service_name (port $port)..."
    
    if curl -s -f "http://localhost:$port/health" > /dev/null; then
        log_success "$service_name - Health check OK"
        return 0
    else
        log_error "$service_name - Health check FAILED"
        return 1
    fi
}

# Test supported formats
test_supported_formats() {
    local service_name=$1
    local port=$2
    
    log_info "Testowanie supported formats dla $service_name..."
    
    if curl -s -f "http://localhost:$port/api/pdf/supported-formats" > /dev/null; then
        log_success "$service_name - Supported formats OK"
        return 0
    else
        log_warning "$service_name - Supported formats FAILED"
        return 1
    fi
}

# Test merge PDFs
test_merge_pdfs() {
    local service_name=$1
    local port=$2
    
    log_info "Testowanie merge PDFs dla $service_name..."
    
    # Użyj plików DOC jako PDF (dla testów)
    local response=$(curl -s -w "%{http_code}" -X POST \
        -F "files=@Data/file-sample_100kB.docx" \
        -F "files=@Data/file-sample_500kB.doc" \
        -F "outputFormat=A4" \
        "http://localhost:$port/api/pdf/merge-pdfs")
    
    local http_code="${response: -3}"
    
    if [[ "$http_code" == "200" ]]; then
        log_success "$service_name - Merge PDFs OK"
        return 0
    else
        log_warning "$service_name - Merge PDFs FAILED (HTTP $http_code)"
        return 1
    fi
}

# Test images to PDF
test_images_to_pdf() {
    local service_name=$1
    local port=$2
    
    log_info "Testowanie images to PDF dla $service_name..."
    
    local response=$(curl -s -w "%{http_code}" -X POST \
        -F "files=@Data/pexels-jamshed-ahmad-560590-1315655.jpg" \
        -F "files=@Data/pexels-annpeach-15143046.jpg" \
        -F "outputFormat=A4" \
        "http://localhost:$port/api/pdf/images-to-pdf")
    
    local http_code="${response: -3}"
    
    if [[ "$http_code" == "200" ]]; then
        log_success "$service_name - Images to PDF OK"
        return 0
    else
        log_warning "$service_name - Images to PDF FAILED (HTTP $http_code)"
        return 1
    fi
}

# Test merge all
test_merge_all() {
    local service_name=$1
    local port=$2
    
    log_info "Testowanie merge all dla $service_name..."
    
    local response=$(curl -s -w "%{http_code}" -X POST \
        -F "files=@Data/file-sample_100kB.docx" \
        -F "files=@Data/pexels-jamshed-ahmad-560590-1315655.jpg" \
        -F "outputFormat=A4" \
        "http://localhost:$port/api/pdf/merge-all")
    
    local http_code="${response: -3}"
    
    if [[ "$http_code" == "200" ]]; then
        log_success "$service_name - Merge all OK"
        return 0
    else
        log_warning "$service_name - Merge all FAILED (HTTP $http_code)"
        return 1
    fi
}

# Test DOC to PDF (tylko NodeJS i Go)
test_doc_to_pdf() {
    local service_name=$1
    local port=$2
    
    # Sprawdź czy serwis obsługuje konwersję DOC
    if [[ "$service_name" == "NodeJSPdfService" ]] || [[ "$service_name" == "GoPdfService" ]]; then
        log_info "Testowanie DOC to PDF dla $service_name..."
        
        local response=$(curl -s -w "%{http_code}" -X POST \
            -F "file=@Data/file-sample_100kB.docx" \
            "http://localhost:$port/api/pdf/doc-to-pdf")
        
        local http_code="${response: -3}"
        
        if [[ "$http_code" == "200" ]]; then
            log_success "$service_name - DOC to PDF OK"
            return 0
        else
            log_warning "$service_name - DOC to PDF FAILED (HTTP $http_code)"
            return 1
        fi
    else
        log_info "$service_name - Pomijam test DOC to PDF (nieobsługiwane)"
        return 0
    fi
}

# Test add QR code (tylko NodeJS i Go)
test_add_qr_code() {
    local service_name=$1
    local port=$2
    
    if [[ "$service_name" == "NodeJSPdfService" ]] || [[ "$service_name" == "GoPdfService" ]]; then
        log_info "Testowanie add QR code dla $service_name..."
        
        local response=$(curl -s -w "%{http_code}" -X POST \
            -F "file=@Data/file-sample_100kB.docx" \
            -F "text=https://github.com/example/repo" \
            "http://localhost:$port/api/pdf/add-qr-code")
        
        local http_code="${response: -3}"
        
        if [[ "$http_code" == "200" ]]; then
            log_success "$service_name - Add QR code OK"
            return 0
        else
            log_warning "$service_name - Add QR code FAILED (HTTP $http_code)"
            return 1
        fi
    else
        log_info "$service_name - Pomijam test add QR code (nieobsługiwane)"
        return 0
    fi
}

# Test add barcode (tylko NodeJS i Go)
test_add_barcode() {
    local service_name=$1
    local port=$2
    
    if [[ "$service_name" == "NodeJSPdfService" ]] || [[ "$service_name" == "GoPdfService" ]]; then
        log_info "Testowanie add barcode dla $service_name..."
        
        local response=$(curl -s -w "%{http_code}" -X POST \
            -F "file=@Data/file-sample_100kB.docx" \
            -F "text=987654321" \
            "http://localhost:$port/api/pdf/add-barcode")
        
        local http_code="${response: -3}"
        
        if [[ "$http_code" == "200" ]]; then
            log_success "$service_name - Add barcode OK"
            return 0
        else
            log_warning "$service_name - Add barcode FAILED (HTTP $http_code)"
            return 1
        fi
    else
        log_info "$service_name - Pomijam test add barcode (nieobsługiwane)"
        return 0
    fi
}

# Test read codes (jeśli pliki testowe istnieją)
test_read_codes() {
    local service_name=$1
    local port=$2
    
    if [[ -f "test-files/barcode_test.png" ]] && [[ -f "test-files/qr_test.png" ]]; then
        if [[ "$service_name" == "NodeJSPdfService" ]] || [[ "$service_name" == "PythonPdfService" ]] || [[ "$service_name" == "GoPdfService" ]]; then
            log_info "Testowanie read codes dla $service_name..."
            
            local response=$(curl -s -w "%{http_code}" -X POST \
                -F "file=@test-files/barcode_test.png" \
                "http://localhost:$port/api/pdf/read-barcodes")
            
            local http_code="${response: -3}"
            
            if [[ "$http_code" == "200" ]]; then
                log_success "$service_name - Read codes OK"
                return 0
            else
                log_warning "$service_name - Read codes FAILED (HTTP $http_code)"
                return 1
            fi
        else
            log_info "$service_name - Pomijam test read codes (nieobsługiwane)"
            return 0
        fi
    else
        log_info "Pomijam test read codes (brak plików testowych)"
        return 0
    fi
}

# Test digital signatures (tylko NodeJS i Go)
test_digital_signatures() {
    local service_name=$1
    local port=$2
    
    if [[ "$service_name" == "NodeJSPdfService" ]] || [[ "$service_name" == "GoPdfService" ]]; then
        log_info "Testowanie digital signatures dla $service_name..."
        
        local response=$(curl -s -w "%{http_code}" -X POST \
            -F "file=@Data/file-sample_100kB.docx" \
            "http://localhost:$port/api/pdf/sign")
        
        local http_code="${response: -3}"
        
        if [[ "$http_code" == "200" ]]; then
            log_success "$service_name - Digital signatures OK"
            return 0
        else
            log_warning "$service_name - Digital signatures FAILED (HTTP $http_code)"
            return 1
        fi
    else
        log_info "$service_name - Pomijam test digital signatures (nieobsługiwane)"
        return 0
    fi
}

# Test pojedynczego serwisu
test_service() {
    local service_info=$1
    local service_name=$(echo "$service_info" | cut -d: -f1)
    local port=$(echo "$service_info" | cut -d: -f2)
    
    echo "========================================"
    log_info "Testowanie serwisu: $service_name (port $port)"
    echo "========================================"
    
    local total_tests=0
    local passed_tests=0
    
    # Health check
    ((total_tests++))
    if test_health "$service_name" "$port"; then
        ((passed_tests++))
    fi
    
    # Supported formats
    ((total_tests++))
    if test_supported_formats "$service_name" "$port"; then
        ((passed_tests++))
    fi
    
    # Merge PDFs
    ((total_tests++))
    if test_merge_pdfs "$service_name" "$port"; then
        ((passed_tests++))
    fi
    
    # Images to PDF
    ((total_tests++))
    if test_images_to_pdf "$service_name" "$port"; then
        ((passed_tests++))
    fi
    
    # Merge all
    ((total_tests++))
    if test_merge_all "$service_name" "$port"; then
        ((passed_tests++))
    fi
    
    # DOC to PDF
    ((total_tests++))
    if test_doc_to_pdf "$service_name" "$port"; then
        ((passed_tests++))
    fi
    
    # Add QR code
    ((total_tests++))
    if test_add_qr_code "$service_name" "$port"; then
        ((passed_tests++))
    fi
    
    # Add barcode
    ((total_tests++))
    if test_add_barcode "$service_name" "$port"; then
        ((passed_tests++))
    fi
    
    # Read codes
    ((total_tests++))
    if test_read_codes "$service_name" "$port"; then
        ((passed_tests++))
    fi
    
    # Digital signatures
    ((total_tests++))
    if test_digital_signatures "$service_name" "$port"; then
        ((passed_tests++))
    fi
    
    echo
    log_info "Wyniki dla $service_name: $passed_tests/$total_tests testów przeszło"
    
    if [[ $passed_tests -eq $total_tests ]]; then
        log_success "$service_name - WSZYSTKIE TESTY PRZESZŁY"
    else
        log_warning "$service_name - NIEKTÓRE TESTY NIE PRZESZŁY"
    fi
    
    echo
    return $((total_tests - passed_tests))
}

# Główna funkcja
main() {
    echo "========================================"
    echo "Multi-Platform PDF Services - Test Suite"
    echo "========================================"
    echo
    
    # Sprawdź pliki testowe
    check_test_files
    
    # Sprawdź czy curl jest dostępny
    if ! command -v curl &> /dev/null; then
        log_error "curl nie jest zainstalowany. Zainstaluj curl aby kontynuować."
        exit 1
    fi
    
    local total_services=0
    local working_services=0
    local failed_services=0
    
    # Testuj każdy serwis
    for service in "${SERVICES[@]}"; do
        ((total_services++))
        
        if test_service "$service"; then
            ((working_services++))
        else
            ((failed_services++))
        fi
    done
    
    echo "========================================"
    echo "PODSUMOWANIE TESTÓW"
    echo "========================================"
    log_info "Łącznie serwisów: $total_services"
    log_success "Działające serwisy: $working_services"
    
    if [[ $failed_services -gt 0 ]]; then
        log_error "Niedziałające serwisy: $failed_services"
    else
        log_success "Wszystkie serwisy działają poprawnie!"
    fi
    
    echo
    log_info "Aby uruchomić serwisy, użyj: docker compose up -d"
    log_info "Aby sprawdzić logi: docker compose logs -f [service-name]"
    echo
}

# Uruchom główną funkcję
main "$@" 