#!/usr/bin/env node

import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import AdmZip from 'adm-zip';

const DEFAULT_EXT_ID = 'nemmanchfojaehgkbgcfmdiidbopakpp';
const DEFAULT_OUTPUT = 'extensions/virtru';

function chromePlatform() {
  if (process.platform === 'darwin') return 'Mac';
  if (process.platform === 'win32') return 'Win';
  return 'Linux';
}

async function resolveChromeVersion() {
  if (process.env.CHROME_PRODVERSION) {
    return process.env.CHROME_PRODVERSION;
  }

  const platform = chromePlatform();
  const releasesUrl = `https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=${platform}&num=1`;
  const response = await fetch(releasesUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch Chrome release info (HTTP ${response.status})`);
  }

  const releases = await response.json();
  const version = releases?.[0]?.version;
  if (!version) {
    throw new Error('Stable Chrome version missing from release response.');
  }
  return version;
}

async function downloadCrx(extensionId, prodVersion) {
  const url = new URL('https://clients2.google.com/service/update2/crx');
  url.searchParams.set('response', 'redirect');
  url.searchParams.set('prodversion', prodVersion);
  url.searchParams.set('acceptformat', 'crx3');
  url.searchParams.set('prod', 'chrome');
  url.searchParams.set('x', `id=${extensionId}&installsource=ondemand&uc`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download extension (HTTP ${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const extensionId = process.env.VIRTRU_EXT_ID ?? DEFAULT_EXT_ID;
  const outputDir = resolve(process.argv[2] ?? process.env.VIRTRU_EXT_PATH ?? DEFAULT_OUTPUT);

  console.log(`⏬ Downloading Virtru extension ${extensionId} …`);
  const prodVersion = await resolveChromeVersion();
  console.log(`   • Using Chrome version ${prodVersion}`);

  const buffer = await downloadCrx(extensionId, prodVersion);
  if (buffer.subarray(0, 4).toString() !== 'Cr24') {
    throw new Error('Downloaded file is not a valid CRX archive.');
  }

  const headerLength = buffer.readUInt32LE(8);
  const zipBuffer = buffer.subarray(12 + headerLength);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(outputDir, true);

  console.log(`✅ Virtru extension extracted to ${outputDir}`);
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exitCode = 1;
});
