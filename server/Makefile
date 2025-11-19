# CarpSchool Supabase Server Makefile

.PHONY: help start stop restart status logs clean health backup restore deploy test

# Default target
help: ## Show this help message
	@echo "CarpSchool Supabase Server"
	@echo "========================="
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Development commands
start: ## Start all services
	@echo "🚀 Starting CarpSchool Supabase Server..."
	./start-dev.sh



start-proxy: ## Start all services including proxy
	@echo "🚀 Starting CarpSchool Supabase Server with proxy..."
	./start-dev.sh --with-proxy

stop: ## Stop all services
	@echo "🛑 Stopping services..."
	docker compose down

restart: ## Restart all services
	@echo "🔄 Restarting services..."
	docker compose restart

# Service management
status: ## Show status of all services
	@echo "📊 Service Status:"
	@docker compose ps --format "table {{.Service}}\t{{.State}}\t{{.Status}}\t{{.Ports}}"

logs: ## Show logs for all services
	@docker compose logs -f

logs-db: ## Show database logs
	@docker compose logs -f supabase-db

logs-functions: ## Show Edge Functions logs
	@docker compose logs -f supabase-functions

logs-auth: ## Show auth service logs
	@docker compose logs -f supabase-auth

# Database commands
db-shell: ## Open database shell
	@docker compose exec supabase-db psql -U supabase_admin -d postgres

db-migrate: ## Apply database migrations
	@echo "📊 Applying migrations..."
	@if [ -f "supabase/migrations/01_initial_schema.sql" ]; then \
		docker compose exec -T supabase-db psql -U supabase_admin -d postgres < supabase/migrations/01_initial_schema.sql; \
		echo "✅ Initial schema applied"; \
	fi
	@if [ -f "supabase/migrations/02_rls_policies.sql" ]; then \
		docker compose exec -T supabase-db psql -U supabase_admin -d postgres < supabase/migrations/02_rls_policies.sql; \
		echo "✅ RLS policies applied"; \
	fi
	@if [ -f "supabase/migrations/03_seed_data.sql" ]; then \
		docker compose exec -T supabase-db psql -U supabase_admin -d postgres < supabase/migrations/03_seed_data.sql; \
		echo "✅ Seed data applied"; \
	fi

db-reset: ## Reset database (WARNING: destroys all data)
	@echo "⚠️  This will destroy ALL data. Are you sure? [y/N]"
	@read -r response; \
	if [ "$$response" = "y" ] || [ "$$response" = "Y" ]; then \
		echo "🗑️  Resetting database..."; \
		docker compose down -v; \
		./start-dev.sh; \
	else \
		echo "❌ Database reset cancelled"; \
	fi

# Health and monitoring
health: ## Run health checks
	@./health-check.sh

health-quick: ## Run quick health checks
	@./health-check.sh --quick

health-full: ## Run full health checks
	@./health-check.sh --full

# Backup and restore
backup: ## Create full backup
	@./backup-restore.sh backup

backup-db: ## Backup database only
	@./backup-restore.sh backup-db

backup-list: ## List available backups
	@./backup-restore.sh list

# Development utilities
clean: ## Clean up stopped containers and unused images
	@echo "🧹 Cleaning up..."
	@docker compose down
	@docker system prune -f
	@echo "✅ Cleanup completed"

clean-all: ## Clean up everything including volumes (WARNING: destroys data)
	@echo "⚠️  This will destroy ALL data including volumes. Are you sure? [y/N]"
	@read -r response; \
	if [ "$$response" = "y" ] || [ "$$response" = "Y" ]; then \
		echo "🗑️  Cleaning everything..."; \
		docker compose down -v; \
		docker system prune -af; \
		docker volume prune -f; \
		echo "✅ Everything cleaned"; \
	else \
		echo "❌ Cleanup cancelled"; \
	fi

# Functions development
functions-restart: ## Restart Edge Functions only
	@docker compose restart supabase-functions

functions-logs: ## Show Edge Functions logs
	@docker compose logs -f supabase-functions

# Testing
test-auth: ## Test authentication endpoints
	@echo "🧪 Testing authentication endpoints..."
	@curl -s -X POST http://localhost:8000/functions/v1/main/captcha/generate | jq '.'

test-captcha: ## Test CAPTCHA generation
	@echo "🧪 Testing CAPTCHA generation..."
	@curl -s -X POST http://localhost:8000/functions/v1/main/captcha/generate | jq '.'

test-api: ## Test all API endpoints
	@echo "🧪 Testing API endpoints..."
	@echo "Main Router:"
	@curl -s http://localhost:8000/functions/v1/main | jq '.'
	@echo "\nCaptcha Generation:"
	@curl -s -X POST http://localhost:8000/functions/v1/main/captcha/generate | jq '.'

# Studio and admin
studio: ## Open Supabase Studio in browser
	@echo "🎨 Opening Supabase Studio..."
	@open http://localhost:3001 || xdg-open http://localhost:3001 || echo "Please open http://localhost:3001 in your browser"

studio-url: ## Show Supabase Studio URL
	@echo "🎨 Supabase Studio: http://localhost:3001"

email: ## Open email testing interface
	@echo "📧 Opening email testing interface..."
	@open http://localhost:9000 || xdg-open http://localhost:9000 || echo "Please open http://localhost:9000 in your browser"

# Production deployment
deploy-check: ## Check if ready for production deployment
	@echo "🔍 Checking production readiness..."
	@./deploy-production.sh --check || echo "❌ Not ready for production"

deploy: ## Deploy to production (requires environment variables)
	@echo "🚀 Deploying to production..."
	@./deploy-production.sh

# Configuration
config-check: ## Check configuration files
	@echo "🔧 Checking configuration..."
	@if [ ! -f .env ]; then echo "❌ .env file missing"; exit 1; fi
	@if [ ! -f supabase/config.toml ]; then echo "❌ supabase/config.toml missing"; exit 1; fi
	@if [ ! -f kong.yml ]; then echo "❌ Kong configuration missing"; exit 1; fi
	@echo "✅ Configuration files present"

env-example: ## Show environment variables example
	@echo "📄 Environment variables (.env):"
	@cat .env.example

# Information
info: ## Show system information
	@echo "ℹ️  System Information:"
	@echo "Docker version: $$(docker --version)"
	@echo "Docker Compose version: $$(docker compose version --short)"
	@echo "Current directory: $$(pwd)"
	@echo "Available memory: $$(free -h | grep Mem | awk '{print $$2}')"
	@echo "Available disk: $$(df -h . | awk 'NR==2 {print $$4}')"

urls: ## Show all service URLs
	@echo "🌐 Service URLs:"
	@echo "Supabase Studio:    http://localhost:3001"
	@echo "Supabase API:       http://localhost:8000"
	@echo "Email Testing:      http://localhost:9000"
	@echo "Database:           localhost:5432"
	@echo "Functions:          http://localhost:8000/functions/v1/main"
	@echo ""
	@echo "Optional Services:"
	@echo "Nominatim:          http://localhost:40060"
	@echo "Tileserver:         http://localhost:40061"
	@echo "OSRM:              http://localhost:40062"
	@echo "CodePush API:      http://localhost:40064"
	@echo "CodePush Admin:    http://localhost:40065"

# Quick development workflow
dev: ## Start development environment and show status
	@$(MAKE) start
	@sleep 5
	@$(MAKE) status
	@$(MAKE) urls

# Documentation
docs: ## Open documentation
	@echo "📚 Documentation:"
	@echo "README:           cat README.md"
	@echo "API Endpoints:    See README.md#api-endpoints"
	@echo "Supabase Docs:    https://supabase.com/docs"
