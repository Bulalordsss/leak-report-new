import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export type LatLng = { lat: number; lng: number };
export type MapMarker = { id: string; position: LatLng; title?: string };

export type LeafletMapProps = {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  /** Optional user location; will show a person marker on the map when provided */
  userLocation?: LatLng;
  style?: any;
};

export default function LeafletMap({ center, zoom = 15, markers = [], userLocation, style }: LeafletMapProps) {
  const html = useMemo(() => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; }
    .leaflet-container { background: #fff; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const center = [${center.lat}, ${center.lng}];
    const map = L.map('map').setView(center, ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const markers = ${JSON.stringify(markers)};
    markers.forEach(m => {
      const mk = L.marker([m.position.lat, m.position.lng]).addTo(map);
      if (m.title) mk.bindPopup(m.title);
    });

    // Optional user location with a person-shaped marker
    ${userLocation ? `
    const userIcon = L.divIcon({
      className: 'user-location-icon',
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:2px solid #ffffff;box-shadow:0 0 6px rgba(37,99,235,0.8);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker([${userLocation.lat}, ${userLocation.lng}], { icon: userIcon }).addTo(map);
    ` : ''}

    map.on('click', function(e) {
      const payload = { lat: e.latlng.lat, lng: e.latlng.lng };
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'map-click', payload }));
    });
  </script>
</body>
</html>`, [center.lat, center.lng, zoom, markers, userLocation?.lat, userLocation?.lng]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 240, borderRadius: 16, overflow: 'hidden' },
});
