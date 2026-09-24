/**
 * Application-wide configuration.
 * In CI / production set MCRS_BASE_URL via a .env file
 * (e.g. with react-native-dotenv) or via build-time injection.
 * Falls back to the local dev server for Android emulator (10.0.2.2 = host loopback).
 */

// @ts-ignore – populated by metro bundler / build toolchain in CI
const envBaseUrl: string | undefined =
  typeof process !== 'undefined'
    ? (process.env.MCRS_BASE_URL as string | undefined)
    : undefined;

/** Root URL of the NestJS backend – no trailing slash. */
export const BASE_URL: string = envBaseUrl ?? 'https://dma-morning-inspection-app.onrender.com';

/** Full versioned API prefix. */
export const API_BASE: string = `${BASE_URL}/api/v1`;

/** Inspection time-window boundaries (24-h format). */
export const WINDOW_OPEN_HOUR = 5;    // 05:00 AM
export const WINDOW_OPEN_MINUTE = 0;
export const WINDOW_CLOSE_HOUR = 7;   // 07:30 AM
export const WINDOW_CLOSE_MINUTE = 30;

/** Maximum number of photos per submission. */
export const MAX_PHOTOS = 10;

/** Maximum offline retry attempts before a queued item is skipped. */
export const MAX_RETRY_COUNT = 5;
