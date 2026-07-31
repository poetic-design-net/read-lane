import { appConfig } from "@/lib/config";

/** Canonical share URL (backend.md: /s/{shareId}). /d/ remains supported. */
export function shareUrl(publicId: string): string {
  return `${appConfig.url}/s/${publicId}`;
}

/** Legacy path still works via rewrite / soft alias */
export function shareUrlLegacy(publicId: string): string {
  return `${appConfig.url}/d/${publicId}`;
}


export function manageUrl(token: string): string {
  return `${appConfig.url}/manage/${token}`;
}

export function projectUrl(publicId: string): string {
  return `${appConfig.url}/dashboard/projects/${publicId}`;
}

export function cliDeviceUrl(userCode: string): string {
  return `${appConfig.url}/cli/authorize?code=${encodeURIComponent(userCode)}`;
}
