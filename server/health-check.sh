#!/bin/bash

# CarpSchool Supabase Health Check Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${SUPABASE_URL:-http://localhost:8000}"
TIMEOUT=10
FAILED_CHECKS=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_CHECKS++))
}

check_service() {
    local service_name="$1"
    local check_command="$2"
    
    log_info "Checking $service_name..."
    
    if eval "$check_command"; then
        log_success "$service_name is healthy"
        return 0
    else
        log_error "$service_name is unhealthy"
        return 1
    fi
}

check_http_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    log_info "Checking $name at $url..."
    
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        log_success "$name is responding (HTTP $response)"
        return 0
    else
        log_error "$name is not responding (HTTP $response)"
        return 1
    fi
}

check_api_endpoint() {
    local name="$1"
    local endpoint="$2"
    local expected_pattern="$3"
    
    log_info "Checking $name API..."
    
    local response
    response=$(curl -s --max-time "$TIMEOUT" "$BASE_URL/functions/v1/main$endpoint" 2>/dev/null || echo "")
    
    if echo "$response" | grep -q "$expected_pattern"; then
        log_success "$name API is working"
        return 0
    else
        log_error "$name API is not working. Response: $response"
        return 1
    fi
}

check_docker_service() {
    local service_name="$1"
    
    if docker compose ps --format "table {{.Service}}\t{{.State}}" | grep -q "$service_name.*running"; then
        return 0
    else
        return 1
    fi
}

check_database_connection() {
    log_info "Checking database connection..."
    
    local result
    result=$(docker compose exec -T supabase-db psql -U supabase_admin -d postgres -t -c "SELECT 1;" 2>/dev/null | tr -d ' \n' || echo "")
    
    if [ "$result" = "1" ]; then
        log_success "Database is accessible"
        return 0
    else
        log_error "Database is not accessible"
        return 1
    fi
}

check_database_tables() {
    log_info "Checking database schema..."
    
    local tables
    tables=$(docker compose exec -T supabase-db psql -U supabase_admin -d postgres -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' \n' || echo "0")
    
    if [ "$tables" -gt 10 ]; then
        log_success "Database schema is loaded ($tables tables)"
        return 0
    else
        log_error "Database schema is incomplete ($tables tables)"
        return 1
    fi
}

check_storage_bucket() {
    log_info "Checking storage bucket..."
    
    # Try to access storage API
    local response
    response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/storage/v1/bucket" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "400" ] || [ "$response" = "401" ]; then
        log_success "Storage service is responding"
        return 0
    else
        log_error "Storage service is not responding (HTTP $response)"
        return 1
    fi
}

check_edge_functions() {
    log_info "Checking Edge Functions..."
    
    # Check main router
    check_api_endpoint "Main Router" "" "available_functions"
    
    # Check captcha function
    check_api_endpoint "Captcha" "/captcha/generate" "sessionId"
    
    # Check auth function (should return 401 without auth)
    local auth_response
    auth_response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/functions/v1/main/auth/get-profile" 2>/dev/null || echo "000")
    
    if [ "$auth_response" = "401" ]; then
        log_success "Auth function is working (returns 401 as expected)"
    else
        log_error "Auth function is not working (HTTP $auth_response)"
        ((FAILED_CHECKS++))
    fi
}

check_external_services() {
    log_info "Checking external services..."
    
    # Check if tileserver is running
    if check_docker_service "tileserver-gl"; then
        check_http_endpoint "Tileserver" "http://localhost:8082"
    else
        log_warn "Tileserver is not running (optional service)"
    fi
    
    # Check if nominatim is running
    if check_docker_service "nominatim"; then
        check_http_endpoint "Nominatim" "http://localhost:8080"
    else
        log_warn "Nominatim is not running (optional service)"
    fi
    
    # Check if OSRM is running
    if check_docker_service "osrm"; then
        check_http_endpoint "OSRM" "http://localhost:8083"
    else
        log_warn "OSRM is not running (optional service)"
    fi
}

check_resource_usage() {
    log_info "Checking resource usage..."
    
    # Check disk space
    local disk_usage
    disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 80 ]; then
        log_success "Disk usage is acceptable ($disk_usage%)"
    elif [ "$disk_usage" -lt 90 ]; then
        log_warn "Disk usage is high ($disk_usage%)"
    else
        log_error "Disk usage is critical ($disk_usage%)"
        ((FAILED_CHECKS++))
    fi
    
    # Check memory usage
    local mem_usage
    mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    
    if [ "$mem_usage" -lt 80 ]; then
        log_success "Memory usage is acceptable ($mem_usage%)"
    elif [ "$mem_usage" -lt 90 ]; then
        log_warn "Memory usage is high ($mem_usage%)"
    else
        log_error "Memory usage is critical ($mem_usage%)"
        ((FAILED_CHECKS++))
    fi
}

generate_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local status="HEALTHY"
    
    if [ "$FAILED_CHECKS" -gt 0 ]; then
        status="UNHEALTHY"
    fi
    
    echo ""
    echo "=============================================="
    echo "CarpSchool Health Check Report"
    echo "=============================================="
    echo "Timestamp: $timestamp"
    echo "Overall Status: $status"
    echo "Failed Checks: $FAILED_CHECKS"
    echo ""
    
    if [ "$FAILED_CHECKS" -gt 0 ]; then
        echo "❌ Some services are unhealthy. Check the logs above for details."
        echo ""
        echo "Troubleshooting steps:"
        echo "1. Check service logs: docker compose logs -f [service_name]"
        echo "2. Restart unhealthy services: docker compose restart [service_name]"
        echo "3. Check resource usage: docker stats"
        echo "4. Verify configuration files"
        echo ""
        return 1
    else
        echo "✅ All services are healthy!"
        return 0
    fi
}

show_help() {
    echo "CarpSchool Supabase Health Check Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --quick      Quick check (core services only)"
    echo "  --full       Full check (includes external services)"
    echo "  --json       Output in JSON format"
    echo "  --help       Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  SUPABASE_URL    Base URL for Supabase (default: http://localhost:8000)"
    echo "  TIMEOUT         Request timeout in seconds (default: 10)"
    echo ""
    echo "Examples:"
    echo "  $0              # Standard health check"
    echo "  $0 --quick      # Quick check only"
    echo "  $0 --full       # Full check including external services"
}

# Main execution
main() {
    echo "🏥 CarpSchool Supabase Health Check"
    echo "===================================="
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check if services are running
    if ! docker compose ps &> /dev/null; then
        log_error "Docker Compose services are not running"
        exit 1
    fi
    
    # Core health checks
    log_info "Starting core health checks..."
    
    check_service "Database" check_database_connection
    check_database_tables
    
    check_service "Supabase Auth" "check_docker_service supabase-auth"
    check_service "Supabase REST" "check_docker_service supabase-rest" 
    check_service "Supabase Realtime" "check_docker_service supabase-realtime"
    check_service "Supabase Storage" "check_docker_service supabase-storage"
    check_service "Supabase Functions" "check_docker_service supabase-functions"
    check_service "Kong Gateway" "check_docker_service kong"
    
    check_http_endpoint "Supabase Studio" "http://localhost:3001"
    check_storage_bucket
    check_edge_functions
    
    # Extended checks based on arguments
    case "${1:-}" in
        "--quick")
            log_info "Quick check completed"
            ;;
        "--full")
            check_external_services
            check_resource_usage
            ;;
        "--json")
            # TODO: Implement JSON output
            log_warn "JSON output not yet implemented"
            ;;
        "--help"|"-h")
            show_help
            exit 0
            ;;
        "")
            # Default: include external services if running
            check_external_services
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
    
    # Generate final report
    generate_report
}

# Run main function with all arguments
main "$@"
