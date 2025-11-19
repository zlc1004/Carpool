# External Map Services

This directory contains the map and geocoding services that support the CarpSchool application. These services are separated from the main Supabase server for better modularity and scalability.

All services are defined in a single `docker-compose.yml` file for simplified management.

## Services

### 📍 Nominatim
- **Purpose**: Geocoding service (converts addresses to coordinates and vice versa)
- **Container**: `nominatim`
- **Internal Port**: 8080

### 🗺️ Tileserver-GL
- **Purpose**: Map tile server for rendering interactive maps
- **Container**: `tileserver-gl`
- **Internal Port**: 8082

### 🛣️ OSRM (Open Source Routing Machine)
- **Purpose**: Route optimization and navigation
- **Container**: `osrm`
- **Internal Port**: 8083

## Usage

### Starting All Map Services
From the server directory:
```bash
./start-dev.sh
```

Or directly from the services directory:
```bash
cd services
docker compose up -d
```

### Using the Management Script
```bash
cd services

# Start all services
./manage-services.sh start

# Check status
./manage-services.sh status

# View logs for specific service
./manage-services.sh logs nominatim

# Stop all services
./manage-services.sh stop
```

### Individual Service Control
```bash
cd services

# Start specific service
docker compose up -d nominatim

# View logs for specific service
docker compose logs -f tileserver-gl

# Stop specific service
docker compose stop osrm
```

### Stopping All Services
```bash
cd services
docker compose down
```

## Data Requirements

### Map Data Structure
```
server/
├── openmaptilesdata/
│   ├── data/           # Map data files (.mbtiles, .osm.pbf)
│   ├── style/          # Map styling configuration
│   └── build/          # Build artifacts
├── osrmdata/
│   └── data/           # OSRM routing data (.osrm files)
└── pgdataNominatimInternal/  # Nominatim PostgreSQL data
```

### Setting Up Map Data
1. Download OpenMapTiles data for your region
2. Place .mbtiles files in `server/openmaptilesdata/data/`
3. Configure styling in `server/openmaptilesdata/style/`
4. Prepare OSRM routing data and place in `server/osrmdata/data/`

## Network
All services connect to the external `carpool_network` Docker network, allowing communication with the main Supabase server and each other.

## Configuration
All services can be configured by editing the main `docker-compose.yml` file in this directory:
- Environment variables
- Volume mounts
- Resource limits
- Health checks

## Access Through Proxy
When the service-proxy is enabled (via `--with-proxy` flag), these services are accessible externally:
- **Nominatim**: http://localhost:40060
- **Tileserver**: http://localhost:40061
- **OSRM**: http://localhost:40062

Otherwise, they communicate internally via Docker DNS using their container names.
