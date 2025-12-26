/**
 * BLE Data Converter
 * Converts BLE streaming data to ZIP/CSV format compatible with Movella DOT Fusion export
 */

import JSZip from 'jszip';
import { FusionMeasurementData } from './movellaBleService';
import { DeviceTag } from './movellaBleService';

/**
 * Create CSV content for a sensor in Movella DOT Fusion format
 */
export function createCSVForSensor(
  deviceTag: number | DeviceTag,
  sensorId: string,
  data: FusionMeasurementData[],
  startTime: Date
): string {
  // Convert DeviceTag enum to number if needed
  const deviceTagNum = typeof deviceTag === 'number' ? deviceTag : Number(deviceTag);
  // Generate filename based on device tag and timestamp
  // Format: {deviceTag}_{YYYYMMDD}_{HHMMSS}_{milliseconds}.csv
  const year = startTime.getFullYear();
  const month = String(startTime.getMonth() + 1).padStart(2, '0');
  const day = String(startTime.getDate()).padStart(2, '0');
  const hours = String(startTime.getHours()).padStart(2, '0');
  const minutes = String(startTime.getMinutes()).padStart(2, '0');
  const seconds = String(startTime.getSeconds()).padStart(2, '0');
  const milliseconds = String(startTime.getMilliseconds()).padStart(3, '0');
  
  const timestampStr = `${year}${month}${day}_${hours}${minutes}${seconds}_${milliseconds}`;
  const filename = `${deviceTagNum}_${timestampStr}.csv`;

  // CSV header matching Movella DOT export format
  const startTimeStr = `${year}-${month}-${day}_${hours}:${minutes}:${seconds}_${milliseconds} WEST`;
  
  const header = [
    'sep=,',
    `DeviceTag:,${deviceTagNum}`,
    'FirmwareVersion:,3.0.0', // Default - could be read from device if available
    'AppVersion:,2023.6.0',
    'SyncStatus:,Synced',
    'OutputRate:,60Hz', // Default - could be configured
    'FilterProfile:,General',
    'Measurement Mode:,Sensor fusion Mode - Extended(Euler)',
    `StartTime: ,${startTimeStr}`,
    '© Movella Technologies B. V. 2005-2025',
    '',
    'PacketCounter,SampleTimeFine,Euler_X,Euler_Y,Euler_Z,FreeAcc_X,FreeAcc_Y,FreeAcc_Z,Status',
  ].join('\n');

  // CSV data rows
  const rows = data.map((row) => {
    return [
      row.PacketCounter,
      Math.round(row.SampleTimeFine), // Round to integer microseconds
      row.Euler_X.toFixed(6),
      row.Euler_Y.toFixed(6),
      row.Euler_Z.toFixed(6),
      row.FreeAcc_X.toFixed(6),
      row.FreeAcc_Y.toFixed(6),
      row.FreeAcc_Z.toFixed(6),
      row.Status,
    ].join(',');
  });

  return header + '\n' + rows.join('\n');
}

/**
 * Convert BLE exercise data to ZIP file (base64)
 * @param exerciseData Map of sensorId -> FusionMeasurementData[]
 * @param deviceTagMap Map of sensorId -> DeviceTag
 * @param startTime Exercise start time
 * @returns Base64 encoded ZIP file
 */
export async function convertBleDataToZip(
  exerciseData: Map<string, FusionMeasurementData[]>,
  deviceTagMap: Map<string, DeviceTag>,
  startTime: Date
): Promise<string> {
  console.log(`📦 [Converter] convertBleDataToZip called`);
  console.log(`📦 [Converter] exerciseData entries: ${exerciseData.size}`);
  console.log(`📦 [Converter] deviceTagMap entries: ${deviceTagMap.size}`);
  console.log(`📦 [Converter] startTime: ${startTime.toISOString()}`);
  
  const zip = new JSZip();

  // Create CSV file for each sensor
  for (const [sensorId, data] of exerciseData.entries()) {
    const deviceTagEnum = deviceTagMap.get(sensorId);
    if (!deviceTagEnum) {
      console.warn(`⚠️ [Converter] No device tag found for sensor ${sensorId}, skipping`);
      continue;
    }

    // Convert DeviceTag enum to number
    const deviceTag = typeof deviceTagEnum === 'number' ? deviceTagEnum : Number(deviceTagEnum);
    console.log(`📦 [Converter] Processing sensor ${sensorId}: DeviceTag=${deviceTag} (enum=${deviceTagEnum}), data samples=${data.length}`);

    if (data.length === 0) {
      console.warn(`⚠️ [Converter] No data for sensor ${sensorId}, skipping`);
      continue;
    }

    // Log first and last data samples for debugging
    if (data.length > 0) {
      console.log(`📦 [Converter] First sample for ${sensorId}:`, {
        PacketCounter: data[0].PacketCounter,
        SampleTimeFine: data[0].SampleTimeFine,
        Euler_X: data[0].Euler_X,
        Euler_Y: data[0].Euler_Y,
        Euler_Z: data[0].Euler_Z,
      });
      console.log(`📦 [Converter] Last sample for ${sensorId}:`, {
        PacketCounter: data[data.length - 1].PacketCounter,
        SampleTimeFine: data[data.length - 1].SampleTimeFine,
        Euler_X: data[data.length - 1].Euler_X,
        Euler_Y: data[data.length - 1].Euler_Y,
        Euler_Z: data[data.length - 1].Euler_Z,
      });
    }

    const csvContent = createCSVForSensor(deviceTag, sensorId, data, startTime);
    // Format: {deviceTag}_{YYYYMMDD}_{HHMMSS}_{milliseconds}.csv
    const year = startTime.getFullYear();
    const month = String(startTime.getMonth() + 1).padStart(2, '0');
    const day = String(startTime.getDate()).padStart(2, '0');
    const hours = String(startTime.getHours()).padStart(2, '0');
    const minutes = String(startTime.getMinutes()).padStart(2, '0');
    const seconds = String(startTime.getSeconds()).padStart(2, '0');
    const milliseconds = String(startTime.getMilliseconds()).padStart(3, '0');
    const timestampStr = `${year}${month}${day}_${hours}${minutes}${seconds}_${milliseconds}`;
    const filename = `${deviceTag}_${timestampStr}.csv`;
    
    zip.file(filename, csvContent);
    console.log(`✅ [Converter] Added CSV for sensor ${sensorId} (DeviceTag ${deviceTag}): ${data.length} samples, filename=${filename}`);
    console.log(`📦 [Converter] CSV content length: ${csvContent.length} chars, first 200 chars: ${csvContent.substring(0, 200)}`);
  }

  // Generate ZIP as base64
  console.log(`📦 [Converter] Generating ZIP file...`);
  const zipBlob = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const fileCount = Object.keys(zip.files).length;
  console.log(`✅ [Converter] Created ZIP with ${fileCount} CSV files`);
  console.log(`📦 [Converter] ZIP base64 length: ${zipBlob.length} chars`);
  console.log(`📦 [Converter] ZIP base64 preview (first 100 chars): ${zipBlob.substring(0, 100)}`);
  return zipBlob;
}

