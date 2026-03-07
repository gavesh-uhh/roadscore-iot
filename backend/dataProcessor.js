// =============================================
// DATA PROCESSOR
// =============================================

const { getDoc, getCollection } = require('./utils/db');

async function processLiveData(deviceId) {
  try {
    
    const liveData = await getDoc('liveData', deviceId);
    if (!liveData) {
      return { success: false, error: 'Device not found' };
    }

    const parsedData = parseRawData(liveData);

    return {
      success: true,
      deviceId,
      parsedData,
      timestamp: Date.now()
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}


function parseRawData(liveData) {
  return {
    speed: parseFloat(liveData.speed) || 0,
    acceleration: {
      x: parseFloat(liveData.acceleration?.x) || 0,
      y: parseFloat(liveData.acceleration?.y) || 0,
      z: parseFloat(liveData.acceleration?.z) || 0
    },
    gyroscope: {
      pitch: parseFloat(liveData.gyroscope?.pitch) || 0,
      roll: parseFloat(liveData.gyroscope?.roll) || 0,
      yaw: parseFloat(liveData.gyroscope?.yaw) || 0
    },
    gps: {
      lat: parseFloat(liveData.gps?.lat) || 0,
      lng: parseFloat(liveData.gps?.lng) || 0
    },
    vibration: Boolean(liveData.vibration),
    soundDetected: Boolean(liveData.soundDetected),
    timestamp: liveData.timestamp || Date.now()
  };
}


async function processAllDevices() {
  try {
    const liveData = await getCollection('liveData');
    const deviceIds = Object.keys(liveData);
    
    
    const results = [];
    for (const deviceId of deviceIds) {
      const result = await processLiveData(deviceId);
      results.push(result);
    }
    
    return results;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  processLiveData,
  processAllDevices,
  parseRawData
};
