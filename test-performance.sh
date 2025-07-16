#!/bin/bash

# Skrypt do testowania wydajności serwisów PDF
# Automatycznie testuje wszystkie serwisy PDF i generuje raport porównawczy

set -e

# Kolory dla wyświetlania
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Konfiguracja
SERVICES=("ironpdf" "pdfsharp" "python")
ITERATIONS=5
OUTPUT_DIR="./test-results"

# Konfiguracja serwisów
declare -A SERVICE_URLS
SERVICE_URLS["ironpdf"]="http://localhost:5001"
SERVICE_URLS["pdfsharp"]="http://localhost:5002"
SERVICE_URLS["python"]="http://localhost:5003"

# Pliki testowe
PDF_FILES=("test-files/sample1.pdf" "test-files/sample2.pdf")
IMAGE_FILES=("test-files/sample1.jpg" "test-files/sample2.png")

# Funkcje pomocnicze
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

test_service_health() {
    local service=$1
    local url=$2
    
    if curl -s -f "$url/health" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

perform_test() {
    local service=$1
    local endpoint=$2
    local url=$3
    local iteration=$4
    
    local start_time=$(date +%s%3N)
    local result_file="$OUTPUT_DIR/${service}_${endpoint}_${iteration}.pdf"
    
    case $endpoint in
        "merge")
            curl -s -X POST -F "files=@${PDF_FILES[0]}" -F "files=@${PDF_FILES[1]}" \
                "$url/api/pdf/merge" -o "$result_file" 2>/dev/null
            ;;
        "convert-images")
            curl -s -X POST -F "files=@${IMAGE_FILES[0]}" -F "files=@${IMAGE_FILES[1]}" \
                "$url/api/pdf/convert-images" -o "$result_file" 2>/dev/null
            ;;
        "merge-pdfs-and-images")
            curl -s -X POST -F "pdfFiles=@${PDF_FILES[0]}" \
                -F "imageFiles=@${IMAGE_FILES[0]}" -F "imageFiles=@${IMAGE_FILES[1]}" \
                "$url/api/pdf/merge-pdfs-and-images" -o "$result_file" 2>/dev/null
            ;;
        "extract-text")
            curl -s -X POST -F "file=@${PDF_FILES[0]}" \
                "$url/api/pdf/extract-text" -o "$result_file" 2>/dev/null
            ;;
    esac
    
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    local file_size=$(stat -f%z "$result_file" 2>/dev/null || echo "0")
    
    echo "$duration:$file_size"
}

# Główna logika
print_color $CYAN "🚀 Rozpoczynam testowanie wydajności serwisów PDF"
print_color $CYAN "================================================"

# Sprawdź czy serwisy są uruchomione
print_color $YELLOW "🔍 Sprawdzanie dostępności serwisów..."

available_services=()
for service in "${SERVICES[@]}"; do
    if [[ -n "${SERVICE_URLS[$service]}" ]]; then
        if test_service_health "$service" "${SERVICE_URLS[$service]}"; then
            print_color $GREEN "  ✓ $service - DOSTĘPNY"
            available_services+=("$service")
        else
            print_color $RED "  ✗ $service - NIEDOSTĘPNY"
        fi
    fi
done

if [ ${#available_services[@]} -eq 0 ]; then
    print_color $RED "❌ Żaden z serwisów nie jest dostępny!"
    print_color $YELLOW "Uruchom serwisy używając: docker-compose up -d"
    exit 1
fi

# Utwórz katalog wyników
mkdir -p "$OUTPUT_DIR"

# Wykonaj testy
print_color $YELLOW "📊 Wykonywanie testów wydajności..."

declare -A results

for service in "${available_services[@]}"; do
    url="${SERVICE_URLS[$service]}"
    print_color $CYAN "🔧 Testowanie: $service"
    
    for endpoint in "merge" "convert-images" "merge-pdfs-and-images" "extract-text"; do
        print_color $WHITE "  📍 $endpoint:"
        
        for ((i=1; i<=ITERATIONS; i++)); do
            result=$(perform_test "$service" "$endpoint" "$url" "$i")
            IFS=':' read -r duration file_size <<< "$result"
            
            if [ "$file_size" -gt 0 ]; then
                print_color $GREEN "    ✓ Iteracja $i - ${duration}ms - ${file_size} bytes"
                results["${service}_${endpoint}_${i}"]="$duration:$file_size"
            else
                print_color $RED "    ✗ Iteracja $i - BŁĄD"
            fi
            
            # Krótka przerwa między testami
            sleep 0.1
        done
    done
done

# Analiza wyników
print_color $YELLOW "📈 Analiza wyników..."

print_color $CYAN "📊 PODSUMOWANIE WYNIKÓW"
print_color $CYAN "====================="

for service in "${available_services[@]}"; do
    print_color $YELLOW "🏆 $service"
    
    for endpoint in "merge" "convert-images" "merge-pdfs-and-images" "extract-text"; do
        local_durations=()
        local_sizes=()
        success_count=0
        
        for ((i=1; i<=ITERATIONS; i++)); do
            key="${service}_${endpoint}_${i}"
            if [[ -n "${results[$key]}" ]]; then
                IFS=':' read -r duration file_size <<< "${results[$key]}"
                local_durations+=("$duration")
                local_sizes+=("$file_size")
                ((success_count++))
            fi
        done
        
        if [ $success_count -gt 0 ]; then
            # Oblicz średnie
            total_duration=0
            total_size=0
            for duration in "${local_durations[@]}"; do
                total_duration=$((total_duration + duration))
            done
            for size in "${local_sizes[@]}"; do
                total_size=$((total_size + size))
            done
            
            avg_duration=$((total_duration / success_count))
            avg_size=$((total_size / success_count))
            success_rate=$((success_count * 100 / ITERATIONS))
            
            print_color $WHITE "  📍 $endpoint:"
            print_color $GREEN "    ⏱️  Średni czas: ${avg_duration}ms"
            print_color $BLUE "    📄 Średni rozmiar: $((avg_size / 1024))KB"
            print_color $CYAN "    ✅ Skuteczność: ${success_rate}%"
        else
            print_color $RED "  ❌ $endpoint: BRAK SUKCESÓW"
        fi
    done
done

print_color $YELLOW "💾 Wyniki zapisane w: $OUTPUT_DIR"
print_color $GREEN "✅ Testowanie zakończone!" 