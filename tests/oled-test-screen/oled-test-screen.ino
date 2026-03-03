#include <Wire.h>
#include <U8g2lib.h>

#define SDA_PIN 15
#define SCL_PIN 14

U8G2_SH1107_SEEED_128X128_1_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(10000);

  Serial.println("Scanning...");
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    byte err = Wire.endTransmission();
    Serial.printf("0x%02X -> %d\n", addr, err);  // prints EVERY address and its response
  }

  Serial.println("Trying u8g2...");
  if (u8g2.begin()) {
    Serial.println("u8g2 OK");
    u8g2.firstPage();
    do {
      u8g2.setFont(u8g2_font_7x13B_tf);
      u8g2.drawStr(10, 40, "HELLO");
    } while (u8g2.nextPage());
  } else {
    Serial.println("u8g2 FAILED");
  }
}

void loop() {}