#include <WiFi.h>
#include <Wire.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <math.h>

#define SDA_PIN       15
#define SCL_PIN       14
#define MPU_ADDR      0x68
#define VIBRATION_PIN  1
#define SOUND_PIN      3
#define GPS_RX_PIN    13

const char* AP_SSID = "ESP-RoadScore";
const char* AP_PASS = "123123123";

TinyGPSPlus    gps;
HardwareSerial gpsSerial(1);
WiFiServer     server(80);

bool   mpuFound  = false;
bool   gpsOK     = false;
String i2cReport = "";

struct SensorData {
  float   ax, ay, az;
  float   gx, gy, gz;
  float   totalG;
  bool    gpsValid;
  double  lat, lng;
  float   speedKmh;
  float   altM;
  uint8_t sats;
  bool    vibration;
  bool    sound;
} sd;

void checkI2C() {
  int found = 0;
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      char buf[24];
      snprintf(buf, sizeof(buf), "0x%02X", addr);
      i2cReport += String(buf);
      if (addr == MPU_ADDR) { i2cReport += " (MPU6050)"; mpuFound = true; }
      i2cReport += ", ";
      found++;
    }
  }
  if (found == 0) i2cReport = "none";
  else i2cReport = i2cReport.substring(0, i2cReport.length() - 2); // trim trailing ", "
}

void checkGPS() {
  unsigned long t = millis();
  while (millis() - t < 3000) {
    if (gpsSerial.available()) { gpsOK = true; break; }
  }
}

void readMPU() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);
  if (Wire.available() < 14) return;

  int16_t ax  = (int16_t)(Wire.read() << 8 | Wire.read());
  int16_t ay  = (int16_t)(Wire.read() << 8 | Wire.read());
  int16_t az  = (int16_t)(Wire.read() << 8 | Wire.read());
  Wire.read(); Wire.read(); // temp bytes, unused
  int16_t gxr = (int16_t)(Wire.read() << 8 | Wire.read());
  int16_t gyr = (int16_t)(Wire.read() << 8 | Wire.read());
  int16_t gzr = (int16_t)(Wire.read() << 8 | Wire.read());

  sd.ax = ax  / 16384.0f;
  sd.ay = ay  / 16384.0f;
  sd.az = az  / 16384.0f;
  sd.gx = gxr / 131.0f;
  sd.gy = gyr / 131.0f;
  sd.gz = gzr / 131.0f;
  sd.totalG = sqrtf(sd.ax*sd.ax + sd.ay*sd.ay + sd.az*sd.az);
}

void readDigital() {
  sd.vibration = (digitalRead(VIBRATION_PIN) == HIGH);
  sd.sound     = (digitalRead(SOUND_PIN)     == HIGH);
}

void updateGPS() {
  sd.gpsValid = gps.location.isValid();
  sd.lat      = gps.location.lat();
  sd.lng      = gps.location.lng();
  sd.speedKmh = gps.speed.kmph();
  sd.altM     = gps.altitude.meters();
  sd.sats     = (uint8_t)gps.satellites.value();
}

void serveHTML(WiFiClient& client) {
  String pg;
  pg.reserve(2800);

  pg = "<!DOCTYPE html><html><head>"
    "<meta charset='UTF-8'>"
    "<meta name='viewport' content='width=device-width,initial-scale=1'>"
    "<meta http-equiv='refresh' content='2'>"
    "<title>RoadScore</title>"
    "<style>"
    "body{font-family:monospace;font-size:14px;background:#111;color:#ddd;padding:20px;max-width:480px}"
    "h2{color:#fff;border-bottom:1px solid #444;padding-bottom:4px;margin:20px 0 10px}"
    "h2:first-child{margin-top:0}"
    "p{margin:4px 0;display:flex;justify-content:space-between;gap:16px}"
    "span.k{color:#888}"
    "span.v{color:#fff}"
    "span.on{color:#0f0}"
    "span.no{color:#f44}"
    "span.dim{color:#555}"
    "hr{border:none;border-top:1px solid #333;margin:20px 0 0}"
    "footer{color:#555;font-size:12px;margin-top:8px}"
    "</style></head><body>";

  // Status
  pg += "<h2>Status</h2>";
  pg += "<p><span class='k'>MPU6050</span>";
  pg += mpuFound ? "<span class='on'>OK</span>" : "<span class='no'>NOT FOUND</span>";
  pg += "</p>";
  pg += "<p><span class='k'>GPS</span>";
  pg += gpsOK ? "<span class='on'>OK</span>" : "<span class='no'>NO DATA</span>";
  pg += "</p>";
  pg += "<p><span class='k'>I2C devices</span><span class='v'>" + i2cReport + "</span></p>";

  // Accelerometer
  pg += "<h2>Accelerometer</h2>";
  pg += "<p><span class='k'>X</span><span class='v'>"       + String(sd.ax, 3)     + " g</span></p>";
  pg += "<p><span class='k'>Y</span><span class='v'>"       + String(sd.ay, 3)     + " g</span></p>";
  pg += "<p><span class='k'>Z</span><span class='v'>"       + String(sd.az, 3)     + " g</span></p>";
  pg += "<p><span class='k'>Total-G</span><span class='v'>" + String(sd.totalG, 3) + " g</span></p>";

  // Gyroscope
  pg += "<h2>Gyroscope</h2>";
  pg += "<p><span class='k'>Roll  (X)</span><span class='v'>" + String(sd.gx, 1) + " deg/s</span></p>";
  pg += "<p><span class='k'>Pitch (Y)</span><span class='v'>" + String(sd.gy, 1) + " deg/s</span></p>";
  pg += "<p><span class='k'>Yaw   (Z)</span><span class='v'>" + String(sd.gz, 1) + " deg/s</span></p>";

  // Sensors
  pg += "<h2>Sensors</h2>";
  pg += "<p><span class='k'>Vibration (D1)</span>";
  pg += sd.vibration ? "<span class='on'>DETECTED</span>" : "<span class='dim'>clear</span>";
  pg += "</p>";
  pg += "<p><span class='k'>Sound     (D3)</span>";
  pg += sd.sound ? "<span class='on'>DETECTED</span>" : "<span class='dim'>clear</span>";
  pg += "</p>";

  // GPS
  pg += "<h2>GPS</h2>";
  pg += "<p><span class='k'>Fix</span>";
  pg += sd.gpsValid ? "<span class='on'>YES</span>" : "<span class='no'>NO FIX</span>";
  pg += "</p>";
  pg += "<p><span class='k'>Satellites</span><span class='v'>" + String(sd.sats) + "</span></p>";

  if (sd.gpsValid) {
    pg += "<p><span class='k'>Latitude</span><span class='v'>"  + String(sd.lat, 6)      + "</span></p>";
    pg += "<p><span class='k'>Longitude</span><span class='v'>" + String(sd.lng, 6)      + "</span></p>";
    pg += "<p><span class='k'>Speed</span><span class='v'>"     + String(sd.speedKmh, 1) + " km/h</span></p>";
    pg += "<p><span class='k'>Altitude</span><span class='v'>"  + String(sd.altM, 1)     + " m</span></p>";
  } else {
    pg += "<p><span class='k'>Latitude</span><span class='dim'>--</span></p>";
    pg += "<p><span class='k'>Longitude</span><span class='dim'>--</span></p>";
    pg += "<p><span class='k'>Speed</span><span class='dim'>--</span></p>";
    pg += "<p><span class='k'>Altitude</span><span class='dim'>--</span></p>";
  }

  pg += "<hr><footer>ESP-RoadScore | 192.168.4.1 | refresh 2s</footer>";
  pg += "</body></html>";

  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: text/html; charset=utf-8");
  client.println("Connection: close");
  client.println();
  client.print(pg);
}

void setup() {
  Wire.begin(SDA_PIN, SCL_PIN);
  checkI2C();

  // wake MPU6050 from sleep
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  Wire.endTransmission();

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, -1);
  checkGPS();

  pinMode(VIBRATION_PIN, INPUT);
  pinMode(SOUND_PIN,     INPUT);

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);

  server.begin();
}

void loop() {
  while (gpsSerial.available())
    gps.encode(gpsSerial.read());

  readMPU();
  readDigital();
  updateGPS();

  WiFiClient client = server.available();
  if (!client) return;

  unsigned long t = millis();
  while (client.connected() && !client.available()) {
    if (millis() - t > 2000) { client.stop(); return; }
    delay(1);
  }
  while (client.available()) client.read();

  serveHTML(client);
  delay(5);
  client.stop();
}