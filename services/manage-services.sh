#!/bin/bash

# Map Services Management Script
# Usage: ./manage-services.sh [start|stop|restart|status|logs]

set -e

SERVICES=("nominatim" "tileserver-gl" "osrm")

case "${1:-}" in
    start)
        echo "🚀 Starting all map services..."
        
        # Create network if it doesn't exist
        docker network create carpool_network 2>/dev/null || true
        
        for service in "${SERVICES[@]}"; do
            if [ -d "$service" ]; then
                echo "   Starting $service..."
                (cd "$service" && docker compose up -d)
            else
                echo "   ⚠️  $service directory not found"
            fi
        done
        
        echo "✅ All available map services started"
        ;;
        
    stop)
        echo "🛑 Stopping all map services..."
        
        for service in "${SERVICES[@]}"; do
            if [ -d "$service" ]; then
                echo "   Stopping $service..."
                (cd "$service" && docker compose down)
            fi
        done
        
        echo "✅ All map services stopped"
        ;;
        
    restart)
        echo "🔄 Restarting all map services..."
        
        # Stop first
        for service in "${SERVICES[@]}"; do
            if [ -d "$service" ]; then
                (cd "$service" && docker compose down)
            fi
        done
        
        # Then start
        docker network create carpool_network 2>/dev/null || true
        
        for service in "${SERVICES[@]}"; do
            if [ -d "$service" ]; then
                echo "   Starting $service..."
                (cd "$service" && docker compose up -d)
            fi
        done
        
        echo "✅ All map services restarted"
        ;;
        
    status)
        echo "📊 Map Services Status:"
        echo "======================"
        
        for service in "${SERVICES[@]}"; do
            if [ -d "$service" ]; then
                echo ""
                echo "📍 $service:"
                (cd "$service" && docker compose ps --format "table {{.Service}}\t{{.State}}\t{{.Status}}")
            else
                echo "📍 $service: Directory not found"
            fi
        done
        ;;
        
    logs)
        SERVICE="${2:-}"
        
        if [ -n "$SERVICE" ] && [ -d "$SERVICE" ]; then
            echo "📋 Showing logs for $SERVICE..."
            (cd "$SERVICE" && docker compose logs -f)
        else
            echo "📋 Available services for logs:"
            for service in "${SERVICES[@]}"; do
                if [ -d "$service" ]; then
                    echo "   - $service"
                fi
            done
            echo ""
            echo "Usage: $0 logs <service-name>"
        fi
        ;;
        
    *)
        echo "Map Services Management"
        echo "====================="
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  start    Start all map services"
        echo "  stop     Stop all map services"  
        echo "  restart  Restart all map services"
        echo "  status   Show status of all services"
        echo "  logs     Show logs (specify service name)"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs nominatim"
        echo "  $0 status"
        ;;
esac
