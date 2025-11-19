#!/bin/bash

# CarpSchool Supabase Backup and Restore Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker compose ps &> /dev/null; then
        log_error "Docker Compose services are not running"
        exit 1
    fi
}

create_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    log_info "Backup directory: $BACKUP_DIR"
}

backup_database() {
    local backup_file="$BACKUP_DIR/database_$DATE.sql"
    local compressed_file="$BACKUP_DIR/database_$DATE.sql.gz"
    
    log_info "Creating database backup..."
    
    # Create SQL dump
    docker compose exec -T supabase-db pg_dump \
        -U supabase_admin \
        -d postgres \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists > "$backup_file"
    
    # Compress backup
    gzip "$backup_file"
    
    log_info "Database backup created: $compressed_file"
    return 0
}

backup_storage() {
    local storage_backup="$BACKUP_DIR/storage_$DATE.tar.gz"
    
    log_info "Creating storage backup..."
    
    if [ -d "./volumes/storage" ]; then
        tar -czf "$storage_backup" -C ./volumes storage/
        log_info "Storage backup created: $storage_backup"
    else
        log_warn "Storage directory not found, skipping storage backup"
    fi
    
    return 0
}

backup_config() {
    local config_backup="$BACKUP_DIR/config_$DATE.tar.gz"
    
    log_info "Creating configuration backup..."
    
    # Backup configuration files (excluding secrets)
    tar -czf "$config_backup" \
        --exclude='.env' \
        --exclude='*.key' \
        --exclude='*.pem' \
        supabase/ \
        volumes/kong/ \
        nginx-proxy.conf \
        codepush-config.js \
        docker-compose.yml \
        docker-compose.prod.yml
    
    log_info "Configuration backup created: $config_backup"
    return 0
}

backup_all() {
    log_info "Starting full backup..."
    
    create_backup_dir
    backup_database
    backup_storage
    backup_config
    
    # Create backup manifest
    local manifest="$BACKUP_DIR/manifest_$DATE.json"
    cat > "$manifest" << EOF
{
  "backup_date": "$DATE",
  "backup_type": "full",
  "files": {
    "database": "database_$DATE.sql.gz",
    "storage": "storage_$DATE.tar.gz",
    "config": "config_$DATE.tar.gz"
  },
  "services": $(docker compose ps --format json),
  "environment": {
    "docker_version": "$(docker --version)",
    "compose_version": "$(docker compose version --short)"
  }
}
EOF
    
    log_info "Backup manifest created: $manifest"
    log_info "Full backup completed successfully!"
    
    # Clean up old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
    find "$BACKUP_DIR" -name "*.json" -mtime +7 -delete
    log_info "Old backups cleaned up (kept last 7 days)"
}

restore_database() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_warn "This will overwrite the current database. Are you sure? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_info "Database restore cancelled"
        exit 0
    fi
    
    log_info "Restoring database from: $backup_file"
    
    # Stop dependent services
    docker compose stop supabase-auth supabase-rest supabase-realtime supabase-storage supabase-functions
    
    # Restore database
    if [[ "$backup_file" == *.gz ]]; then
        zcat "$backup_file" | docker compose exec -T supabase-db psql -U supabase_admin -d postgres
    else
        cat "$backup_file" | docker compose exec -T supabase-db psql -U supabase_admin -d postgres
    fi
    
    # Restart services
    docker compose start supabase-auth supabase-rest supabase-realtime supabase-storage supabase-functions
    
    log_info "Database restored successfully!"
}

restore_storage() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Storage backup file not found: $backup_file"
        exit 1
    fi
    
    log_warn "This will overwrite current storage files. Are you sure? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_info "Storage restore cancelled"
        exit 0
    fi
    
    log_info "Restoring storage from: $backup_file"
    
    # Stop storage service
    docker compose stop supabase-storage
    
    # Restore storage
    rm -rf ./volumes/storage/*
    tar -xzf "$backup_file" -C ./volumes/
    
    # Restart storage service
    docker compose start supabase-storage
    
    log_info "Storage restored successfully!"
}

list_backups() {
    log_info "Available backups in $BACKUP_DIR:"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        log_warn "No backups found"
        return 0
    fi
    
    echo ""
    echo "Database Backups:"
    ls -lah "$BACKUP_DIR"/database_*.sql.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'
    
    echo ""
    echo "Storage Backups:"
    ls -lah "$BACKUP_DIR"/storage_*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'
    
    echo ""
    echo "Configuration Backups:"
    ls -lah "$BACKUP_DIR"/config_*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'
    
    echo ""
}

show_help() {
    echo "CarpSchool Supabase Backup and Restore Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  backup           Create full backup (database + storage + config)"
    echo "  backup-db        Backup database only"
    echo "  backup-storage   Backup storage only"
    echo "  backup-config    Backup configuration only"
    echo "  restore-db FILE  Restore database from backup file"
    echo "  restore-storage FILE  Restore storage from backup file"
    echo "  list             List available backups"
    echo "  help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 backup                                    # Full backup"
    echo "  $0 backup-db                                # Database backup only"
    echo "  $0 restore-db backups/database_20231201_120000.sql.gz"
    echo "  $0 restore-storage backups/storage_20231201_120000.tar.gz"
    echo "  $0 list                                     # List all backups"
}

# Main script
case "$1" in
    "backup")
        check_dependencies
        backup_all
        ;;
    "backup-db")
        check_dependencies
        create_backup_dir
        backup_database
        ;;
    "backup-storage")
        check_dependencies
        create_backup_dir
        backup_storage
        ;;
    "backup-config")
        check_dependencies
        create_backup_dir
        backup_config
        ;;
    "restore-db")
        if [ -z "$2" ]; then
            log_error "Please specify backup file"
            echo "Usage: $0 restore-db <backup_file>"
            exit 1
        fi
        check_dependencies
        restore_database "$2"
        ;;
    "restore-storage")
        if [ -z "$2" ]; then
            log_error "Please specify backup file"
            echo "Usage: $0 restore-storage <backup_file>"
            exit 1
        fi
        check_dependencies
        restore_storage "$2"
        ;;
    "list")
        list_backups
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
