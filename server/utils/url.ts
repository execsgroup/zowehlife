import type { Request } from "express";

/**
 * Get the base URL for the application
 * Priority: APP_URL env var > REPLIT_DEV_DOMAIN > Request host header > Fallback
 * 
 * This ensures URLs work correctly in both development and production:
 * - Production: Uses APP_URL (e.g., https://zowehlife.com)
 * - Development: Uses REPLIT_DEV_DOMAIN (e.g., https://xxx.replit.dev)
 */
export function getBaseUrl(req?: Request): string {
  // First priority: explicit APP_URL (set in production)
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, ""); // Remove trailing slash
  }
  
  // Second priority: Replit dev domain (available in development)
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  // Third priority: Use request host if available
  if (req) {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    if (host) {
      return `${protocol}://${host}`;
    }
  }
  
  // Final fallback: use REPL_SLUG if available for Replit environments
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  
  // Development fallback
  return "http://localhost:5000";
}

/**
 * Build a full URL path from the base URL
 */
export function buildUrl(path: string, req?: Request): string {
  const base = getBaseUrl(req);
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
