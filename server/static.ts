import express from 'express';
import type { Express } from 'express';
import fs from "node:fs";
import path from "node:path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // SPA fallback: serve index.html for client-side routes. We exclude requests
  // that look like static assets (anything with a file extension) so a missing
  // asset returns a real 404 instead of an HTML body — otherwise the browser
  // receives HTML where it expects JS/CSS and the page renders blank.
  app.use("/{*path}", (req, res, next) => {
    if (/\.[a-zA-Z0-9]+$/.test(req.originalUrl.split("?")[0] ?? "")) return next();
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
