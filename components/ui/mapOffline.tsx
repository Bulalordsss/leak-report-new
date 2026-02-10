import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface MapViewerProps {
  tilesPath: string | null;
  useOfflineMap: boolean;
  style?: any;
}

export default function MapViewer({ tilesPath, useOfflineMap, style }: MapViewerProps) {
  const webViewRef = useRef<WebView>(null);

  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        body, html {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          overflow: hidden;
        }
        #map {
          height: 100%;
          width: 100%;
        }
        .leaflet-container {
          background: #f0f0f0;
        }
        .status-badge {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.95);
          padding: 8px 12px;
          border-radius: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${useOfflineMap ? '#34C759' : '#007AFF'};
        }
        .status-text {
          font-size: 13px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="status-badge">
        <div class="status-dot"></div>
        <div class="status-text">${useOfflineMap ? 'Offline Mode' : 'Online Mode'}</div>
      </div>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        try {
          console.log('Initializing map...');
          console.log('Offline mode:', ${useOfflineMap});
          console.log('Tiles path:', '${tilesPath ?? ''}');
          
          // Initialize map - centered on Davao City
          var map = L.map('map', {
            center: [7.1907, 125.4553],
            zoom: 13,
            minZoom: 0,
            maxZoom: 19,
            maxNativeZoom: 17,
            zoomControl: true
          });

          // Choose tile source based on offline mode
          var tileUrl = ${useOfflineMap}
            ? '${tilesPath ?? ''}{z}/{x}/{y}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

          var attribution = ${useOfflineMap}
            ? 'Davao Roads &copy; DCWD'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

          console.log('Using tile URL:', tileUrl);

          // Add tile layer
          L.tileLayer(tileUrl, {
            attribution: attribution,
            maxZoom: 19,
            maxNativeZoom: 17,
            tileSize: 256,
            errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
          }).addTo(map);

          // Add a marker for Davao City
          var marker = L.marker([7.1907, 125.4553]).addTo(map);
          marker.bindPopup('<b>Davao City</b><br>' + (${useOfflineMap} ? 'Offline Roads Map' : 'Online Map')).openPopup();

          // Listen for messages from React Native
          window.addEventListener('message', function(event) {
            try {
              var data = JSON.parse(event.data);
              if (data.type === 'setView') {
                map.setView([data.lat, data.lng], data.zoom);
              }
            } catch (e) {
              console.log('Message parse error:', e);
            }
          });

          // Map event listeners
          map.on('moveend', function() {
            var center = map.getCenter();
            var zoom = map.getZoom();
            console.log('Map moved to:', center.lat, center.lng, 'zoom:', zoom);
          });

          // Send ready message
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapReady'
            }));
            console.log('Map ready message sent');
          }

          map.on('tileerror', function(error) {
            console.log('Tile error:', error);
          });

          map.on('tileload', function() {
            // tile loaded
          });

        } catch (error) {
          console.error('Map initialization error:', error);
        }
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapReady') {
        console.log('✅ Map is ready and loaded');
      }
    } catch (e) {
      console.log('Error parsing message:', e);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHTML }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowingReadAccessToURL={'file://'}
        originWhitelist={['*']}
        onMessage={handleMessage}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        onLoadStart={() => console.log('WebView loading...')}
        onLoadEnd={() => console.log('WebView loaded')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  webview: {
    flex: 1,
  },
});
