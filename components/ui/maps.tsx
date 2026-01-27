import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export type LatLng = { lat: number; lng: number };
export type MapMarker = { id: string; position: LatLng; title?: string };

export type LeafletMapProps = {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  style?: any;
};

export default function LeafletMap({ center, zoom = 15, markers = [], style }: LeafletMapProps) {
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

    map.on('click', function(e) {
      const payload = { lat: e.latlng.lat, lng: e.latlng.lng };
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'map-click', payload }));
    });
  </script>
</body>
</html>`, [center.lat, center.lng, zoom, markers]);

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
