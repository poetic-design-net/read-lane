import { ImageResponse } from "next/og";
import { appConfig } from "@/lib/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Generic OG image with Readlane CI mark.
 * Public docs still get title/description via generateMetadata.
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F7F7F5",
          color: "#121417",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background:
                "linear-gradient(145deg, #8A9BB0 0%, #5B6C84 42%, #2B313B 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 64 64" fill="none">
              <path
                d="M-4 58 C 10 50, 22 36, 34 24 C 44 14, 54 8, 70 4 L 70 18 C 56 20, 48 26, 40 34 C 30 44, 18 56, -4 62 Z"
                fill="#E8EDF4"
                opacity="0.55"
              />
              <path
                d="M-4 46 C 12 38, 24 24, 36 14 C 46 6, 56 2, 70 -2 L 70 12 C 58 14, 50 18, 42 25 C 32 34, 20 46, -4 52 Z"
                fill="#FFFFFF"
              />
            </svg>

          </div>
          <div
            style={{
              fontSize: 28,
              letterSpacing: "-0.03em",
              color: "#2B313B",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 600,
            }}
          >
            {appConfig.name}
          </div>
        </div>
        <div
          style={{
            fontSize: 56,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            maxWidth: 900,
            fontWeight: 600,
            fontFamily: "Georgia, serif",
            color: "#2B313B",
          }}
        >
          {appConfig.tagline}
        </div>
        <div
          style={{
            fontSize: 22,
            color: "#6B7C93",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {appConfig.brandClaim}
        </div>
      </div>
    ),
    { ...size }
  );
}
