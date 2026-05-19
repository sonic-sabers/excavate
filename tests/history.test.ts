import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import type { ScanResult } from "../src/types.js";
import { saveSnapshot, loadBase, loadHistory } from "../src/history.js";

function makeScan(avgScore: number, date: Date): ScanResult {
  return {
    repoRoot: "/fake",
    scannedAt: date,
    filesScanned: 1,
    durationMs: 100,
    summary: {
      avgScore,
      bedrock: 0,
      deep: 0,
      surface: 0,
      clear: 1,
      estimatedHours: 0,
    },
    files: [],
  };
}

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "excavate-hist-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("loadBase", () => {
  it("returns null when history dir missing", async () => {
    expect(await loadBase(dir)).toBeNull();
  });
});

describe("loadHistory", () => {
  it("returns empty array when history dir missing", async () => {
    expect(await loadHistory(dir)).toEqual([]);
  });
});

describe("saveSnapshot", () => {
  it("saves a file and loadBase returns it", async () => {
    const scan = makeScan(42, new Date("2026-01-01T00:00:00Z"));
    await saveSnapshot(scan, dir, 30);
    const base = await loadBase(dir);
    expect(base).not.toBeNull();
    expect(base!.summary.avgScore).toBe(42);
  });

  it("loadHistory returns snapshots oldest-first", async () => {
    const a = makeScan(50, new Date("2026-01-01T00:00:00Z"));
    const b = makeScan(40, new Date("2026-01-02T00:00:00Z"));
    await saveSnapshot(a, dir, 30);
    await saveSnapshot(b, dir, 30);
    const hist = await loadHistory(dir);
    expect(hist).toHaveLength(2);
    expect(hist[0]!.summary.avgScore).toBe(50);
    expect(hist[1]!.summary.avgScore).toBe(40);
  });

  it("loadBase always returns oldest after pruning", async () => {
    const a = makeScan(10, new Date("2026-01-01T00:00:00Z"));
    const b = makeScan(20, new Date("2026-01-02T00:00:00Z"));
    const c = makeScan(30, new Date("2026-01-03T00:00:00Z"));
    await saveSnapshot(a, dir, 2);
    await saveSnapshot(b, dir, 2);
    await saveSnapshot(c, dir, 2);
    const hist = await loadHistory(dir);
    expect(hist).toHaveLength(2);
    expect(hist[0]!.summary.avgScore).toBe(10); // base preserved
    expect(hist[1]!.summary.avgScore).toBe(30); // latest kept
  });

  it("returns the saved file path", async () => {
    const scan = makeScan(55, new Date("2026-05-11T12:00:00Z"));
    const filePath = await saveSnapshot(scan, dir, 30);
    expect(filePath).toContain("2026-05-11T12-00-00");
    expect(filePath).toMatch(/\.json$/);
  });
});
