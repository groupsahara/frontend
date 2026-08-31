import { NextResponse } from "next/server";

/**
 * Digital Asset Links — what makes restocare.com/book open the Android app.
 *
 * Android fetches this file when the app is installed (android:autoVerify) and
 * only hands the link to the app if this list contains the certificate the
 * installed APK was signed with. Until then the link opens the website, which
 * is the intended fallback rather than a failure.
 *
 * Two fingerprints matter and they are NOT the same:
 *   - the UPLOAD certificate, which signs what we send to Play (and every APK
 *     built here directly);
 *   - the PLAY APP SIGNING certificate, which signs what users actually
 *     install from the Play Store.
 * Listing both means the link verifies for Play installs AND for a release APK
 * shared directly. Add the Play one from Play Console → Test and release → App
 * integrity → App signing key certificate (SHA-256) via ANDROID_CERT_SHA256.
 */

/** Signs local release builds (android/app/restocare-customer-upload.keystore). */
const UPLOAD_CERT_SHA256 =
  "75:18:31:5B:7B:40:8A:0D:10:60:05:ED:EE:E9:E9:6C:11:4B:FB:7D:11:10:E3:96:03:62:B1:B0:2E:77:78:7F";

const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME ?? "com.restocare.customer";

/** Comma-separated, so Play's certificate can be added without a code change. */
const fingerprints = [
  ...(process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean),
  UPLOAD_CERT_SHA256,
].filter((f, i, all) => all.indexOf(f) === i);

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: PACKAGE_NAME,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        // Android requires application/json and follows no redirects here.
        "content-type": "application/json",
        "cache-control": "public, max-age=300",
      },
    },
  );
}
