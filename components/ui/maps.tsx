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
  /** Path to offline tiles directory. When set, tiles load from file:// */
  offlineTilesPath?: string | null;
  style?: any;
};

export default function LeafletMap({ center, zoom = 15, markers = [], userLocation, offlineTilesPath, style }: LeafletMapProps) {
  const useOffline = !!offlineTilesPath;

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
    var center = [${center.lat}, ${center.lng}];
    var map = L.map('map').setView(center, ${zoom});

    var tileUrl = ${useOffline}
      ? '${offlineTilesPath}{z}/{x}/{y}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    var attribution = ${useOffline}
      ? 'Davao Roads &copy; DCWD'
      : '&copy; OpenStreetMap';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      maxNativeZoom: ${useOffline ? 17 : 19},
      tileSize: 256,
      attribution: attribution,
      errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    }).addTo(map);

    var markers = ${JSON.stringify(markers)};
    markers.forEach(function(m) {
      var mk = L.marker([m.position.lat, m.position.lng]).addTo(map);
      if (m.title) mk.bindPopup(m.title);
    });

    ${userLocation ? `
    var userIcon = L.divIcon({
      className: 'user-location-icon',
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:2px solid #ffffff;box-shadow:0 0 6px rgba(37,99,235,0.8);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker([${userLocation.lat}, ${userLocation.lng}], { icon: userIcon }).addTo(map);
    ` : ''}

    map.on('click', function(e) {
      var payload = { lat: e.latlng.lat, lng: e.latlng.lng };
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map-click', payload: payload }));
    });
  </script>
</body>
</html>`, [center.lat, center.lng, zoom, markers, userLocation?.lat, userLocation?.lng, offlineTilesPath, useOffline]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowingReadAccessToURL={'file://'}
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 240, borderRadius: 16, overflow: 'hidden' },
});
