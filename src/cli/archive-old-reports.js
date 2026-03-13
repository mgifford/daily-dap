#!/usr/bin/env node

/**
 * archive-old-reports.js
 *
 * Archives daily report directories that are older than `display-days` days (default: 14).
 * For each qualifying directory:
 *   1. Creates a zip archive in docs/reports/archive/
 *   2. Removes the large report files (index.html, axe-findings.json, axe-findings.csv)
 *      while retaining report.json for history series lookback.
 *   3. Writes a redirect stub index.html pointing visitors to the archive page.
 * Also generates or updates docs/reports/archive/index.html listing all zip archives.
 *
 * Usage:
 *   node src/cli/archive-old-reports.js [--repo-root /path/to/repo] [--display-days 14]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderArchiveIndexPage, renderArchiveRedirectStub } from '../publish/render-pages.js';

const DEFAULT_DISPLAY_DAYS = 14;
const ARCHIVE_SUBDIR = 'archive';
const LARGE_FILES_TO_REMOVE = ['index.html', 'axe-findings.json', 'axe-findings.csv'];

function parseArgs(argv) {
  const args = {
    repoRoot: null,
    displayDays: DEFAULT_DISPLAY_DAYS
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--repo-root') {
      args.repoRoot = argv[++index];
    } else if (token === '--display-days') {
      const parsed = Number(argv[++index]);
      if (Number.isInteger(parsed) && parsed > 0) {
        args.displayDays = parsed;
      } else {
        throw new Error(`--display-days must be a positive integer, got: ${argv[index]}`);
      }
    }
  }

  return args;
}

function getDefaultRepoRoot() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, '..', '..');
}

function createZipArchive(sourceDir, zipPath) {
  const result = spawnSync('zip', ['-r', zipPath, '.'], {
    cwd: sourceDir,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`zip command failed for ${sourceDir}:\n${result.stderr ?? result.error?.message ?? 'unknown error'}`);
  }
}

async function isAlreadyArchived(dailyDir) {
  const indexPath = path.join(dailyDir, 'index.html');
  try {
    const content = await fs.readFile(indexPath, 'utf8');
    return content.includes('data-archived="true"');
  } catch {
    return false;
  }
}

async function directoryExists(dirPath) {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function archiveReportDirectory(reportsRoot, runDate, archiveDir) {
  const dailyDir = path.join(reportsRoot, 'daily', runDate);

  if (!(await directoryExists(dailyDir))) {
    return { skipped: true, reason: 'directory_not_found' };
  }

  if (await isAlreadyArchived(dailyDir)) {
    return { skipped: true, reason: 'already_archived' };
  }

  const zipFilename = `${runDate}.zip`;
  const zipPath = path.join(archiveDir, zipFilename);

  if (!(await fileExists(zipPath))) {
    createZipArchive(dailyDir, zipPath);
  }

  for (const filename of LARGE_FILES_TO_REMOVE) {
    const filePath = path.join(dailyDir, filename);
    await fs.unlink(filePath).catch(() => {});
  }

  const stubHtml = renderArchiveRedirectStub(runDate);
  await fs.writeFile(path.join(dailyDir, 'index.html'), stubHtml, 'utf8');

  return { skipped: false, zipFilename };
}

async function buildArchiveEntries(archiveDir) {
  const entries = [];

  let zipFiles;
  try {
    zipFiles = await fs.readdir(archiveDir);
  } catch {
    return entries;
  }

  for (const filename of zipFiles) {
    if (!filename.endsWith('.zip')) continue;
    const runDate = filename.slice(0, -4);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(runDate)) continue;

    const zipPath = path.join(archiveDir, filename);
    const stat = await fs.stat(zipPath).catch(() => null);

    entries.push({
      run_date: runDate,
      zip_filename: filename,
      size_bytes: stat?.size ?? 0,
      archived_at: stat?.mtime?.toISOString() ?? null
    });
  }

  return entries;
}

async function loadHistoryEntries(reportsRoot) {
  const historyPath = path.join(reportsRoot, 'history.json');
  try {
    const raw = await fs.readFile(historyPath, 'utf8');
    const payload = JSON.parse(raw);
    return payload.entries ?? [];
  } catch {
    return [];
  }
}

async function getLatestReportDate(reportsRoot, historyEntries) {
  if (historyEntries.length > 0) {
    const sorted = [...historyEntries].sort((a, b) => b.run_date.localeCompare(a.run_date));
    return sorted[0].run_date;
  }

  const dailyRoot = path.join(reportsRoot, 'daily');
  try {
    const dirs = await fs.readdir(dailyRoot);
    const dateDirs = dirs.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    if (dateDirs.length > 0) {
      return dateDirs.at(-1);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function getArchiveCutoffDate(latestDate, displayDays) {
  const latest = new Date(`${latestDate}T00:00:00.000Z`);
  const cutoff = new Date(latest);
  // Subtract (displayDays - 1) so exactly displayDays entries remain in the display window.
  // e.g. with displayDays=14: entries for days 0..13 (today through 13 days ago) are kept,
  // and anything before that cutoff date is archived.
  cutoff.setUTCDate(cutoff.getUTCDate() - displayDays + 1);
  return cutoff.toISOString().slice(0, 10);
}

export async function archiveOldReports({ repoRoot, displayDays = DEFAULT_DISPLAY_DAYS } = {}) {
  const resolvedRoot = repoRoot ?? getDefaultRepoRoot();
  const reportsRoot = path.join(resolvedRoot, 'docs', 'reports');
  const archiveDir = path.join(reportsRoot, ARCHIVE_SUBDIR);

  await fs.mkdir(archiveDir, { recursive: true });

  const historyEntries = await loadHistoryEntries(reportsRoot);
  const latestDate = await getLatestReportDate(reportsRoot, historyEntries);

  if (!latestDate) {
    console.log('No reports found. Nothing to archive.');
    return { archived: [], skipped: [] };
  }

  const cutoffDate = getArchiveCutoffDate(latestDate, displayDays);
  console.log(`Latest report: ${latestDate}. Archiving reports older than ${cutoffDate} (display window: ${displayDays} days).`);

  const dailyRoot = path.join(reportsRoot, 'daily');
  let allDirs;
  try {
    allDirs = await fs.readdir(dailyRoot);
  } catch {
    console.log('No daily reports directory found.');
    return { archived: [], skipped: [] };
  }

  const archiveCandidates = allDirs
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d < cutoffDate)
    .sort();

  const archived = [];
  const skipped = [];

  for (const runDate of archiveCandidates) {
    const result = await archiveReportDirectory(reportsRoot, runDate, archiveDir);
    if (result.skipped) {
      console.log(`  Skipped ${runDate}: ${result.reason}`);
      skipped.push({ run_date: runDate, reason: result.reason });
    } else {
      console.log(`  Archived ${runDate} -> ${result.zipFilename}`);
      archived.push({ run_date: runDate, zip_filename: result.zipFilename });
    }
  }

  const archiveEntries = await buildArchiveEntries(archiveDir);
  const archiveIndexHtml = renderArchiveIndexPage({
    entries: archiveEntries,
    generatedAt: new Date().toISOString(),
    displayDays
  });
  await fs.writeFile(path.join(archiveDir, 'index.html'), archiveIndexHtml, 'utf8');

  console.log(`Archive index updated: ${archiveEntries.length} archive(s) listed.`);

  return { archived, skipped };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = parseArgs(process.argv);
  const repoRoot = args.repoRoot ?? getDefaultRepoRoot();
  archiveOldReports({ repoRoot, displayDays: args.displayDays })
    .then(({ archived, skipped }) => {
      console.log(`Done. Archived: ${archived.length}, Skipped: ${skipped.length}`);
    })
    .catch((err) => {
      console.error('Archive failed:', err.message);
      process.exit(1);
    });
}
