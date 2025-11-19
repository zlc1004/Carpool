# External Map Services

This directory contains the map and geocoding services that support the CarpSchool application. These services are separated from the main Supabase server for better modularity and scalability.

## Services

### 📍 Nominatim
- **Purpose**: Geocoding service (converts addresses to coordinates and vice versa)
- **Container**: `nominatim`
- **Internal Port**: 8080
- **Location**: `./services/nominatim/`

### 🗺️ Tileserver-GL
- **Purpose**: Map tile server for rendering interactive maps
- **Container**: `tileserver-gl`
- **Internal Port**: 8082
- **Location**: `./services/tileserver-gl/`

### 🛣️ OSRM (Open Source Routing Machine)
- **Purpose**: Route optimization and navigation
- **Container**: `osrm`
- **Internal Port**: 8083
- **Location**: `./services/osrm/`

## Usage

### Starting All Map Services
From the server directory:
```bash
./start-dev.sh
```

### Starting Individual Services
```bash
# Start Nominatim
cd services/nominatim
docker compose up -d

# Start Tileserver
cd services/tileserver-gl
docker compose up -d

# Start OSRM
cd services/osrm
docker compose up -d
```

### Stopping Services
```bash
# Stop individual service
cd services/[service-name]
docker compose down

# Stop all services
docker stop nominatim tileserver-gl osrm
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
Each service can be configured by editing its respective `docker-compose.yml` file:
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
