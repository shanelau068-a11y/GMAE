import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { get } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";

function request(url) {
  return new Promise((resolve, reject) => {
    const outgoing = get(url, incoming => {
      let body = "";
      incoming.setEncoding("utf8");
      incoming.on("data", chunk => { body += chunk; });
      incoming.on("end", () => resolve({ status: incoming.statusCode, contentType: incoming.headers["content-type"] ?? "", body }));
    });
    outgoing.setTimeout(10000, () => outgoing.destroy(new Error("Local startup request timed out")));
    outgoing.on("error", reject);
  });
}

test("serves the actual Next static export used by GitHub Pages", { timeout: 90000 }, async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, "127.0.0.1", resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  let output = "";
  const child = spawn(process.execPath, [path.join(root, "scripts/serve-static.mjs"), "--port", String(port)], {
    cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, WRANGLER_WRITE_LOGS: "false", WRANGLER_SEND_METRICS: "false", MINIFLARE_REGISTRY_PATH: path.join(root, ".wrangler", "test-registry") },
  });
  child.stdout.on("data", data => { output = (output + data).slice(-15000); });
  child.stderr.on("data", data => { output = (output + data).slice(-15000); });
  try {
    let response;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error("Application exited before startup: " + output);
      try { response = await request("http://localhost:" + port + "/"); if (response.status === 200) break; }
      catch { /* Retry only local startup, never an external service request. */ }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    assert.equal(response?.status, 200, output);
    assert.match(response.contentType, /text\/html/i);
    const html = response.body;
    assert.ok(html.includes("星际雷电"), "Expected the real application, not a starter or error page");
    assert.doesNotMatch(html, /Your site is taking shape|Building your site|Internal Server Error/);
  } finally {
    if (child.exitCode === null && child.pid) {
      if (process.platform === "win32") spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      else child.kill("SIGTERM");
    }
  }
});
