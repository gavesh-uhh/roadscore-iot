#include <WiFi.h>
#include <Wire.h>

#define SDA_PIN  15
#define SCL_PIN  14
#define MPU_ADDR 0x68

WiFiServer server(80);

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  Wire.endTransmission();

  WiFi.softAP("ESP32-RoadScore", "123123123");
  Serial.println(WiFi.softAPIP());
  server.begin();
}

void loop() {
  WiFiClient client = server.available();
  if (!client) return;

  while (client.connected() && !client.available()) delay(1);
  while (client.available()) client.read();

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);

  int16_t ax = Wire.read() << 8 | Wire.read();
  int16_t ay = Wire.read() << 8 | Wire.read();
  int16_t az = Wire.read() << 8 | Wire.read();
  Wire.read(); Wire.read();
  int16_t gx = Wire.read() << 8 | Wire.read();
  int16_t gy = Wire.read() << 8 | Wire.read();
  int16_t gz = Wire.read() << 8 | Wire.read();

  String body = "";
  body += "ax: " + String(ax / 16384.0, 3) + " g\n";
  body += "ay: " + String(ay / 16384.0, 3) + " g\n";
  body += "az: " + String(az / 16384.0, 3) + " g\n";
  body += "gx: " + String(gx / 131.0, 2) + " deg/s\n";
  body += "gy: " + String(gy / 131.0, 2) + " deg/s\n";
  body += "gz: " + String(gz / 131.0, 2) + " deg/s\n";

  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: text/plain");
  client.println("Connection: close");
  client.println();
  client.print(body);
  delay(10);
  client.stop();
}