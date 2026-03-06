#include <Firebase_ESP_Client.h>
#include <HardwareSerial.h>
#include <TinyGPS++.h>
#include <U8g2lib.h>
#include <WiFi.h>
#include <Wire.h>
#include <math.h>

// Pins
#define SDA_PIN 15
#define SCL_PIN 14
#define OLED_ADDR 0x3C
#define MPU_ADDR 0x68
#define VIBRATION_PIN 1
#define SOUND_PIN 3
#define GPS_RX_PIN 13

// Firebase
#define DB_URL                                                                 \
  "https://iot-test-b3636-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FB_API_KEY "AIzaSyBPUZ0bFw1jK6mcjvoOxr4CJ0A6i7snvpQ"
#define FIREBASE_USER "gavesh@gavesh.me"
#define FIREBASE_PASS "123123123"

const char *VEHICLE_ID = "CAB-001";
const char *DEVICE_ID = "ESP32_001";
const char *STA_SSID = "Gavesh";
const char *STA_PASS = "123123123";

const bool DISABLE_SERIAL = false;
const unsigned long FIREBASE_INTERVAL = 10000;
const unsigned long CLIENT_TIMEOUT_MS = 2000;
const unsigned long WIFI_TIMEOUT_MS = 15000;
const unsigned long OLED_UPDATE_INTERVAL = 1000;

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig conf;
TinyGPSPlus gps;
U8G2_SH1107_SEEED_128X128_1_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);
HardwareSerial gpsSerial(1);
WiFiServer server(80);

unsigned long lastOledUpdateTime = 0;
unsigned int currentOledPage = 0;
unsigned long lastPushTime = 0;
bool mpuFound = false;
bool gpsOK = false;
String i2cReport = "";

// Struct for sensor snapshot
struct SensorData {
  float ax, ay, az;
  float gx, gy, gz;
  float totalG;
  bool gpsValid;
  double lat, lng;
  float speedKmh;
  float altM;
  uint8_t sats;
  bool vibration;
  bool sound;
} sd;

/**
  initalizeOled()
  @note : uses the same shared I2C bus (SDA=15, SCL=14).
*/
void initalizeOled() {
  u8g2.begin();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.clearBuffer();
  u8g2.drawStr(18, 40, "RoadScore");
  u8g2.drawStr(14, 56, "Initialising...");
  u8g2.sendBuffer();
}

/**
  updateOledDisplay()
  @note : updates the OLED display with the latest sensor data.
          Rotates through three pages every OLED_UPDATE_INTERVAL milliseconds.
          Call from loop() on every iteration.
  @note : page 0 — device status (MPU/GPS) and accelerometer X/Y/Z/G values.
  @note : page 1 — GPS fix status, satellite count, lat/lng, speed, altitude.
  @note : page 2 — gyroscope roll/pitch/yaw and digital sensor (vibration/sound) states.
*/
void updateOledDisplay() {
  if (millis() - lastOledUpdateTime >= OLED_UPDATE_INTERVAL) {
    currentOledPage = (currentOledPage + 1) % 3;
    lastOledUpdateTime = millis();
  }

  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);

  char buf[32];

  if (currentOledPage == 0) {
    // ── Page 0 : Status + Accelerometer ──────────────────────────────────
    u8g2.drawStr(0, 10, "=== STATUS ===");
    snprintf(buf, sizeof(buf), "MPU : %s", mpuFound ? "OK" : "NOT FOUND");
    u8g2.drawStr(0, 22, buf);
    snprintf(buf, sizeof(buf), "GPS : %s", gpsOK ? "OK" : "NO DATA");
    u8g2.drawStr(0, 34, buf);

    u8g2.drawStr(0, 50, "= ACCEL (g) =");
    snprintf(buf, sizeof(buf), "X: %+.3f", sd.ax);
    u8g2.drawStr(0, 62, buf);
    snprintf(buf, sizeof(buf), "Y: %+.3f", sd.ay);
    u8g2.drawStr(0, 74, buf);
    snprintf(buf, sizeof(buf), "Z: %+.3f", sd.az);
    u8g2.drawStr(0, 86, buf);
    snprintf(buf, sizeof(buf), "G: %.3f", sd.totalG);
    u8g2.drawStr(0, 98, buf);

  } else if (currentOledPage == 1) {
    // ── Page 1 : GPS ─────────────────────────────────────────────────────
    u8g2.drawStr(0, 10, "=== GPS ===");
    snprintf(buf, sizeof(buf), "Fix : %s", sd.gpsValid ? "YES" : "NO FIX");
    u8g2.drawStr(0, 22, buf);
    snprintf(buf, sizeof(buf), "Sats: %u", sd.sats);
    u8g2.drawStr(0, 34, buf);

    if (sd.gpsValid) {
      snprintf(buf, sizeof(buf), "Lat : %.5f", sd.lat);
      u8g2.drawStr(0, 46, buf);
      snprintf(buf, sizeof(buf), "Lng : %.5f", sd.lng);
      u8g2.drawStr(0, 58, buf);
      snprintf(buf, sizeof(buf), "Spd : %.1f km/h", sd.speedKmh);
      u8g2.drawStr(0, 70, buf);
      snprintf(buf, sizeof(buf), "Alt : %.1f m", sd.altM);
      u8g2.drawStr(0, 82, buf);
    } else {
      u8g2.drawStr(0, 50, "Waiting for fix...");
    }

  } else {
    // ── Page 2 : Gyro + Digital sensors ──────────────────────────────────
    u8g2.drawStr(0, 10, "= GYRO (deg/s) =");
    snprintf(buf, sizeof(buf), "R: %+.1f", sd.gx);
    u8g2.drawStr(0, 22, buf);
    snprintf(buf, sizeof(buf), "P: %+.1f", sd.gy);
    u8g2.drawStr(0, 34, buf);
    snprintf(buf, sizeof(buf), "Y: %+.1f", sd.gz);
    u8g2.drawStr(0, 46, buf);

    u8g2.drawStr(0, 62, "=== SENSORS ===");
    snprintf(buf, sizeof(buf), "Vib: %s", sd.vibration ? "DETECTED" : "clear");
    u8g2.drawStr(0, 74, buf);
    snprintf(buf, sizeof(buf), "Snd: %s", sd.sound ? "DETECTED" : "clear");
    u8g2.drawStr(0, 86, buf);
  }

  u8g2.sendBuffer();
}

/**
  feedGPS()
  @note : feed all pending GPS bytes into the parser. Call as often as possible.
*/
void feedGPS() {
  while (gpsSerial.available())
    gps.encode(gpsSerial.read());
}

/**
  checkI2C()
  @note : check if the I2C devices are connected.
*/
void checkI2C() {
  int found = 0;
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      char buf[24];
      snprintf(buf, sizeof(buf), "0x%02X", addr);
      i2cReport += String(buf);
      if (addr == MPU_ADDR)  i2cReport += " (MPU6050)";
      if (addr == OLED_ADDR) i2cReport += " (SH1107)";
      i2cReport += ", ";
      found++;
    }
  }
  if (found == 0)
    i2cReport = "none";
  else
    i2cReport = i2cReport.substring(0, i2cReport.length() - 2);
}

/**
  checkGPS()
  @note : GPS is continuously fed so no data is lost during this check.
*/
void checkGPS() {
  unsigned long start = millis();
  String line = "";

  while (millis() - start < 5000) {
    while (gpsSerial.available()) {
      char c = gpsSerial.read();
      gps.encode(c);
      line += c;
      if (c == '\n') {
        if (line.startsWith("$GPRMC") || line.startsWith("$GNRMC")) {
          gpsOK = true;
          return;
        }
        line = "";
      }
    }
  }
}

/**
  readMPU()
  @note : read the MPU6050 sensor data.
*/
void readMPU() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);
  if (Wire.available() < 14)
    return;

  int16_t ax = (int16_t)(Wire.read() << 8 | Wire.read());
  int16_t ay = (int16_t)(Wire.read() << 8 | Wire.read());
  int16_t az = (int16_t)(Wire.read() << 8 | Wire.read());
  Wire.read();
  Wire.read();
  int16_t gxr = (int16_t)(Wire.read() << 8 | Wire.read());
  int16_t gyr = (int16_t)(Wire.read() << 8 | Wire.read());
  int16_t gzr = (int16_t)(Wire.read() << 8 | Wire.read());

  sd.ax = ax / 16384.0f;
  sd.ay = ay / 16384.0f;
  sd.az = az / 16384.0f;
  sd.gx = gxr / 131.0f;
  sd.gy = gyr / 131.0f;
  sd.gz = gzr / 131.0f;
  sd.totalG = sqrtf(sd.ax * sd.ax + sd.ay * sd.ay + sd.az * sd.az);
}

/**
  readDigital()
  @note : read the digital sensors data.
*/
void readDigital() {
  sd.vibration = (digitalRead(VIBRATION_PIN) == HIGH);
  sd.sound = (digitalRead(SOUND_PIN) == HIGH);
}

/**
  updateGPS()
  @note : update the GPS data.
*/
void updateGPS() {
  sd.gpsValid = gps.location.isValid();
  sd.lat = gps.location.lat();
  sd.lng = gps.location.lng();
  sd.speedKmh = gps.speed.kmph();
  sd.altM = gps.altitude.meters();
  sd.sats = (uint8_t)gps.satellites.value();
}

/**
  pushToFirebase()
  @note : push the sensor data to the firebase database.
  @note : firebase path: liveData/{DEVICE_ID}
*/
void pushToFirebase() {
  if (!Firebase.ready()) return;

  String path = "liveData/" + String(DEVICE_ID);

  FirebaseJson gpsJson;
  gpsJson.set("lat", sd.lat);
  gpsJson.set("lng", sd.lng);

  FirebaseJson accelJson;
  accelJson.set("x", sd.ax);
  accelJson.set("y", sd.ay);
  accelJson.set("z", sd.az);

  FirebaseJson gyroJson;
  gyroJson.set("pitch", sd.gx);
  gyroJson.set("roll", sd.gy);
  gyroJson.set("yaw", sd.gz);

  FirebaseJson payload;
  payload.set("vehicleId", VEHICLE_ID);
  payload.set("timestamp/.sv", "timestamp");
  payload.set("speed", sd.speedKmh);
  payload.set("soundDetected", sd.sound);
  payload.set("vibration", sd.vibration);
  payload.set("gps", gpsJson);
  payload.set("acceleration", accelJson);
  payload.set("gyroscope", gyroJson);

  if (!Firebase.updateNode(fbdo, path, payload))
    Serial.println("Firebase push failed: " + fbdo.errorReason());
}

/**
  serveHTML()
  @note : serve the HTML page to the client.
*/
void serveHTML(WiFiClient &client) {
  String pg;
  pg.reserve(2800);

  pg = "<!DOCTYPE html><html><head>"
       "<meta charset='UTF-8'>"
       "<meta name='viewport' content='width=device-width,initial-scale=1'>"
       "<meta http-equiv='refresh' content='2'>"
       "<title>RoadScore Local Dashboard</title>"
       "<style>"
       "body{font-family:monospace;font-size:14px;background:#111;color:#ddd;"
       "padding:20px;max-width:480px}"
       "h2{color:#fff;border-bottom:1px solid "
       "#444;padding-bottom:4px;margin:20px 0 10px}"
       "h2:first-child{margin-top:0}"
       "p{margin:4px 0;display:flex;justify-content:space-between;gap:16px}"
       "span.k{color:#888}span.v{color:#fff}span.on{color:#0f0}"
       "span.no{color:#f44}span.dim{color:#555}"
       "hr{border:none;border-top:1px solid #333;margin:20px 0 0}"
       "footer{color:#555;font-size:12px;margin-top:8px}"
       "</style></head><body>";

  // Status
  pg += "<h2>Status</h2>";
  pg += "<p><span class='k'>MPU6050</span>";
  pg += mpuFound ? "<span class='on'>OK</span>"
                 : "<span class='no'>NOT FOUND</span>";
  pg += "</p>";
  pg += "<p><span class='k'>GPS</span>";
  pg += gpsOK ? "<span class='on'>OK</span>" : "<span class='no'>NO DATA</span>";
  pg += "</p>";
  pg += "<p><span class='k'>I2C devices</span><span class='v'>" + i2cReport +
        "</span></p>";

  // Accelerometer
  pg += "<h2>Accelerometer</h2>";
  pg += "<p><span class='k'>X</span><span class='v'>" + String(sd.ax, 3) +
        " g</span></p>";
  pg += "<p><span class='k'>Y</span><span class='v'>" + String(sd.ay, 3) +
        " g</span></p>";
  pg += "<p><span class='k'>Z</span><span class='v'>" + String(sd.az, 3) +
        " g</span></p>";
  pg += "<p><span class='k'>Total-G</span><span class='v'>" +
        String(sd.totalG, 3) + " g</span></p>";

  // Gyroscope
  pg += "<h2>Gyroscope</h2>";
  pg += "<p><span class='k'>Roll  (X)</span><span class='v'>" +
        String(sd.gx, 1) + " deg/s</span></p>";
  pg += "<p><span class='k'>Pitch (Y)</span><span class='v'>" +
        String(sd.gy, 1) + " deg/s</span></p>";
  pg += "<p><span class='k'>Yaw   (Z)</span><span class='v'>" +
        String(sd.gz, 1) + " deg/s</span></p>";

  // Sensors
  pg += "<h2>Sensors</h2>";
  pg += "<p><span class='k'>Vibration (D1)</span>";
  pg += sd.vibration ? "<span class='on'>DETECTED</span>"
                     : "<span class='dim'>clear</span>";
  pg += "</p>";
  pg += "<p><span class='k'>Sound     (D3)</span>";
  pg += sd.sound ? "<span class='on'>DETECTED</span>"
                 : "<span class='dim'>clear</span>";
  pg += "</p>";

  // GPS
  pg += "<h2>GPS</h2>";
  pg += "<p><span class='k'>Fix</span>";
  pg += sd.gpsValid ? "<span class='on'>YES</span>"
                    : "<span class='no'>NO FIX</span>";
  pg += "</p>";
  pg += "<p><span class='k'>Satellites</span><span class='v'>" +
        String(sd.sats) + "</span></p>";

  if (sd.gpsValid) {
    pg += "<p><span class='k'>Latitude</span><span class='v'>" +
          String(sd.lat, 6) + "</span></p>";
    pg += "<p><span class='k'>Longitude</span><span class='v'>" +
          String(sd.lng, 6) + "</span></p>";
    pg += "<p><span class='k'>Speed</span><span class='v'>" +
          String(sd.speedKmh, 1) + " km/h</span></p>";
    pg += "<p><span class='k'>Altitude</span><span class='v'>" +
          String(sd.altM, 1) + " m</span></p>";
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

/**
  handleWebClient()
  @note : handle the web client.
*/
void handleWebClient() {
  WiFiClient client = server.available();
  if (!client)
    return;

  unsigned long start = millis();
  while (client.connected() && !client.available()) {
    feedGPS();
    if (millis() - start > CLIENT_TIMEOUT_MS) {
      client.stop();
      return;
    }
  }

  while (client.available())
    client.read();

  serveHTML(client);
  client.flush();
  client.stop();
}

void setup() {
  if (!DISABLE_SERIAL) {
    Serial.begin(115200);
    delay(1000);
  }

  Wire.setTimeOut(100);
  Wire.begin(SDA_PIN, SCL_PIN);

  initalizeOled();
  checkI2C();

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  Wire.endTransmission();

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, -1);
  checkGPS();

  pinMode(VIBRATION_PIN, INPUT_PULLDOWN);
  pinMode(SOUND_PIN, INPUT_PULLDOWN);

  WiFi.mode(WIFI_STA);
  WiFi.begin(STA_SSID, STA_PASS);
  Serial.print("Connecting to WiFi");

  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - wifiStart < WIFI_TIMEOUT_MS) {
    feedGPS();
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED)
    Serial.println("\nConnected: " + WiFi.localIP().toString());
  else
    Serial.println("\nWiFi failed — check SSID/password");

  server.begin();
  Serial.println("HTTP server ready");

  conf.database_url = DB_URL;
  conf.api_key = FB_API_KEY;
  conf.timeout.serverResponse = 10000;
  auth.user.email = FIREBASE_USER;
  auth.user.password = FIREBASE_PASS;

  Firebase.reconnectNetwork(true);
  fbdo.setResponseSize(4096);
  Firebase.begin(&conf, &auth);
  Firebase.setDoubleDigits(5);

  Serial.println("Firebase ready");
}

void loop() {
  feedGPS();
  readMPU();
  readDigital();
  updateGPS();
  updateOledDisplay();
  if (millis() - lastPushTime >= FIREBASE_INTERVAL) {
    pushToFirebase();
    lastPushTime = millis();
  }
  handleWebClient();
}