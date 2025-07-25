import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Map, Marker, Popup } from "react-leaflet";
import { MapContainer } from "../styles/MapView";
import { AsyncTileLayer } from '../utils/AsyncTileLayer';

/**
 * MapView component that displays an interactive Leaflet map with coordinate points
 * Uses AsyncTileLayer for non-blocking tile loading to improve performance
 * Takes coordinates array as input to display multiple points on the map
 * Optional tileServerUrl prop for self-hosted OpenMapTiles server
 */
export default function MapView({ coordinates, tileServerUrl }) {
  const mapRef = useRef(null);

  // Calculate map center based on coordinates
  const getMapCenter = () => {
    if (!coordinates || coordinates.length === 0) {
      return [49.345196, -123.149805]; // Default to Vancouver
    }

    if (coordinates.length === 1) {
      return [coordinates[0].lat, coordinates[0].lng];
    }

    // Calculate center of all coordinates
    const latSum = coordinates.reduce((sum, coord) => sum + coord.lat, 0);
    const lngSum = coordinates.reduce((sum, coord) => sum + coord.lng, 0);
    return [latSum / coordinates.length, lngSum / coordinates.length];
  };

  // Calculate appropriate zoom level based on coordinate spread
  const getZoomLevel = () => {
    if (!coordinates || coordinates.length <= 1) {
      return 13;
    }

    const lats = coordinates.map((coord) => coord.lat);
    const lngs = coordinates.map((coord) => coord.lng);
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);
    const maxSpread = Math.max(latSpread, lngSpread);

    if (maxSpread > 0.1) return 10;
    if (maxSpread > 0.05) return 11;
    if (maxSpread > 0.01) return 12;
    return 13;
  };

  // Get tile server URL
  const getTileUrl = () => {
    const effectiveTileServerUrl =
      tileServerUrl && tileServerUrl.trim() !== ""
        ? tileServerUrl
        : "/tileserver";

    return `${effectiveTileServerUrl}/styles/OSM%20OpenMapTiles/{z}/{x}/{y}.png`;
  };

  // Add async tile layer to map and fit bounds
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current.leafletElement;
      
      // Create and add async tile layer
      const asyncTileLayer = new AsyncTileLayer(getTileUrl(), {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        tileSize: 256,
      });
      
      asyncTileLayer.addTo(map);
      
      // Fit bounds to show all coordinates
      if (coordinates && coordinates.length > 1) {
        const bounds = coordinates.map((coord) => [coord.lat, coord.lng]);
        map.fitBounds(bounds, { padding: [20, 20] });
      }
      
      // Cleanup on unmount
      return () => {
        if (map.hasLayer(asyncTileLayer)) {
          map.removeLayer(asyncTileLayer);
        }
      };
    }
  }, [coordinates, tileServerUrl]);

  return (
    <MapContainer>
      <Map
        ref={mapRef}
        center={getMapCenter()}
        zoom={getZoomLevel()}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        {/* AsyncTileLayer is added programmatically in useEffect */}
        
        {coordinates &&
          coordinates.map((coord, index) => (
            <Marker key={index} position={[coord.lat, coord.lng]}>
              {coord.label && <Popup>{coord.label}</Popup>}
            </Marker>
          ))}
      </Map>
    </MapContainer>
  );
}

MapView.propTypes = {
  coordinates: PropTypes.arrayOf(
    PropTypes.shape({
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired,
      label: PropTypes.string, // Optional label for popup
    }),
  ),
  tileServerUrl: PropTypes.string, // Optional: URL to self-hosted OpenMapTiles server
};
