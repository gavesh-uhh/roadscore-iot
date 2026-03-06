#include <WiFi.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

TinyGPSPlus gps;
HardwareSerial gpsSerial(1);
WiFiServer server(80);
String nmeaBuffer = "";

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, 13, -1);

  WiFi.softAP("ESP32-RoadScore", "123123123");
  Serial.println(WiFi.softAPIP());
  server.begin();
}

void loop() {
  while (gpsSerial.available()) {
    char c = gpsSerial.read();
    gps.encode(c);
    nmeaBuffer += c;
    if (nmeaBuffer.length() > 1000) 
      nmeaBuffer = nmeaBuffer.substring(nmeaBuffer.length() - 1000);
  }

  WiFiClient client = server.available();
  if (!client) return;

  while (client.connected() && !client.available()) delay(1);
  while (client.available()) client.read();

  String body = "<h2>GPS Status</h2>";
  body += "<p>Valid: " + String(gps.location.isValid() ? "YES" : "NO") + "</p>";
  body += "<p>Satellites: " + String(gps.satellites.value()) + "</p>";
  body += "<p>Lat: " + String(gps.location.lat(), 6) + "</p>";
  body += "<p>Lng: " + String(gps.location.lng(), 6) + "</p>";
  body += "<p>Speed: " + String(gps.speed.kmph(), 2) + " km/h</p>";
  body += "<p>Altitude: " + String(gps.altitude.meters(), 2) + " m</p>";
  body += "<h3>Raw NMEA</h3>";
  body += "<pre style='background:#000;color:#0f0;padding:10px;font-size:11px'>" + nmeaBuffer + "</pre>";
  body += "<meta http-equiv='refresh' content='2'>";

  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: text/html");
  client.println("Connection: close");
  client.println();
  client.print(body);
  delay(10);
  client.stop();
}