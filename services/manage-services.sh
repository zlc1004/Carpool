#!/bin/bash

# Map Services Management Script
# Usage: ./manage-services.sh [start|stop|restart|status|logs]

set -e

case "${1:-}" in
    start)
        echo "🚀 Starting all map services..."

        # Create network if it doesn't exist (independent operation)
        if ! docker network ls --format "{{.Name}}" | grep -q "^carpool_network$"; then
            echo "   Creating carpool_network..."
            docker network create carpool_network
        else
            echo "   Using existing carpool_network..."
        fi

        # Start all services from consolidated compose file
        docker compose up -d

        echo "✅ All map services started"
        ;;

    stop)
        echo "🛑 Stopping all map services..."

        docker compose down

        echo "✅ All map services stopped"
        ;;

    restart)
        echo "🔄 Restarting all map services..."

        docker compose down

        # Ensure network exists (independent operation)
        if ! docker network ls --format "{{.Name}}" | grep -q "^carpool_network$"; then
            echo "   Creating carpool_network..."
            docker network create carpool_network
        fi

        docker compose up -d

        echo "✅ All map services restarted"
        ;;

    status)
        echo "📊 Map Services Status:"
        echo "======================"

        docker compose ps --format "table {{.Service}}\t{{.State}}\t{{.Status}}\t{{.Ports}}"
        ;;

    logs)
        SERVICE="${2:-}"

        if [ -n "$SERVICE" ]; then
            echo "📋 Showing logs for $SERVICE..."
            docker compose logs -f "$SERVICE"
        else
            echo "📋 Available services for logs:"
            echo "   - tileserver-gl"
            echo "   - nominatim"
            echo "   - osrm"
            echo ""
            echo "Usage: $0 logs <service-name>"
            echo "   or: $0 logs (for all services)"
            echo ""
            echo "To view all logs: docker compose logs -f"
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
