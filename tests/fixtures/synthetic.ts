import { Encoder } from "@garmin/fitsdk";
export function fitBytes(
  sport: "running" | "swimming" | "cycling" | "crossCountrySkiing" = "running",
) {
  const encoder = new Encoder();
  const fileId = {
    mesgNum: 0 as const,
    type: "activity",
    manufacturer: "development",
    product: 1,
    serialNumber: 1,
    timeCreated: new Date("2026-01-02T08:00:00Z"),
  };
  encoder.writeMesg(fileId);
  const session = {
    mesgNum: 18 as const,
    sport,
    subSport: "generic",
    startTime: new Date("2026-01-02T08:00:00Z"),
    timestamp: new Date("2026-01-02T08:30:00Z"),
    totalElapsedTime: 1800,
    totalTimerTime: 1800,
    totalDistance: 5000,
    totalAscent: 40,
    avgSpeed: 5000 / 1800,
    avgHeartRate: 140,
  };
  encoder.writeMesg(session);
  return new Uint8Array(encoder.close()).buffer;
}
export function gpxXml(
  sport = "Running",
  start = "2026-01-02T08:00:00Z",
  name = "Synthetic outing",
) {
  const d = new Date(start);
  const end = new Date(d.valueOf() + 1800e3).toISOString();
  return `<?xml version="1.0"?><gpx version="1.1"><trk><name>${name}</name><type>${sport}</type><trkseg><trkpt lat="0" lon="0"><ele>10</ele><time>${start}</time></trkpt><trkpt lat="0" lon="0.044966"><ele>50</ele><time>${end}</time></trkpt></trkseg></trk></gpx>`;
}
export function tcxXml(sport = "Running", start = "2026-01-02T08:00:00Z") {
  return `<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"><Activities><Activity Sport="${sport}"><Id>${start}</Id><Lap StartTime="${start}"><TotalTimeSeconds>1800</TotalTimeSeconds><DistanceMeters>5000</DistanceMeters><MaximumSpeed>4</MaximumSpeed><Calories>300</Calories><Track><Trackpoint><Time>${start}</Time><AltitudeMeters>10</AltitudeMeters></Trackpoint><Trackpoint><Time>${new Date(Date.parse(start) + 1800e3).toISOString()}</Time><AltitudeMeters>50</AltitudeMeters></Trackpoint></Track></Lap></Activity></Activities></TrainingCenterDatabase>`;
}

export function largeGpx(start: string, points = 500) {
  return `<gpx version="1.1"><trk><name>Synthetic training</name><type>Running</type><trkseg>${Array.from({ length: points }, (_, i) => `<trkpt lat="0" lon="${(i * 0.00009).toFixed(6)}"><ele>${10 + i * 0.1}</ele><time>${new Date(Date.parse(start) + i * 5000).toISOString()}</time></trkpt>`).join("")}</trkseg></trk></gpx>`;
}
