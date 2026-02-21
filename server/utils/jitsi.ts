const JITSI_BASE_URL = "https://meet.jit.si";

export function generateJitsiLink(roomName: string): string {
  return `${JITSI_BASE_URL}/${roomName}`;
}

export function generateMassJitsiLink(churchName: string): string {
  const sanitized = churchName.replace(/[^a-zA-Z0-9]/g, "");
  return `${JITSI_BASE_URL}/${sanitized}-mass-${Date.now()}`;
}

export function generatePersonalJitsiLink(churchName: string, personName: string): string {
  const sanitizedChurch = churchName.replace(/[^a-zA-Z0-9]/g, "");
  const sanitizedName = personName.replace(/[^a-zA-Z0-9]/g, "");
  return `${JITSI_BASE_URL}/${sanitizedChurch}-${sanitizedName}-${Date.now()}`;
}
