import Constants from 'expo-constants';
import { Platform } from 'react-native';

const releaseRepoUrl = 'https://github.com/australiaimmigration2026/immigration';
const latestReleaseUrl = 'https://api.github.com/repos/australiaimmigration2026/immigration/releases/latest';

type GitHubReleaseAsset = {
  browser_download_url?: string;
  name?: string;
};

type GitHubRelease = {
  assets?: GitHubReleaseAsset[];
  body?: string;
  html_url?: string;
  name?: string;
  published_at?: string;
  tag_name?: string;
};

export type AppUpdate = {
  assetName?: string;
  currentVersion: string;
  downloadUrl: string;
  latestVersion: string;
  notes?: string;
  publishedAt?: string;
  releaseName: string;
  releaseUrl: string;
};

function getCurrentVersion() {
  return Constants.nativeAppVersion || Constants.expoConfig?.version || '0.0.0';
}

function normalizeVersion(version?: string) {
  const normalized = version?.trim().replace(/^v/i, '').split(/[+-]/)[0] ?? '';
  const parts = normalized.match(/\d+/g);

  if (!parts?.length) {
    return '';
  }

  return parts.slice(0, 3).join('.');
}

function compareVersions(leftVersion: string, rightVersion: string) {
  const left = normalizeVersion(leftVersion).split('.').map((part) => Number(part || 0));
  const right = normalizeVersion(rightVersion).split('.').map((part) => Number(part || 0));
  const maxLength = Math.max(left.length, right.length, 3);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;

    if (leftPart > rightPart) {
      return 1;
    }

    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
}

export async function checkForAppUpdate(): Promise<AppUpdate | null> {
  if (Platform.OS !== 'android') {
    return null;
  }

  const currentVersion = getCurrentVersion();
  const response = await fetch(latestReleaseUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const release = await response.json() as GitHubRelease;
  const latestVersion = normalizeVersion(release.tag_name || release.name);

  if (!latestVersion || compareVersions(currentVersion, latestVersion) >= 0) {
    return null;
  }

  const apkAsset = release.assets?.find((asset) => asset.name?.toLowerCase().endsWith('.apk'));
  const releaseUrl = release.html_url || `${releaseRepoUrl}/releases/latest`;
  const downloadUrl = apkAsset?.browser_download_url || releaseUrl;

  return {
    assetName: apkAsset?.name,
    currentVersion,
    downloadUrl,
    latestVersion,
    notes: release.body?.trim(),
    publishedAt: release.published_at,
    releaseName: release.name || release.tag_name || `v${latestVersion}`,
    releaseUrl,
  };
}
