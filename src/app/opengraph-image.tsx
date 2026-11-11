import { ImageResponse } from "next/og";
import { appConfig } from "@/lib/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Site-wide Open Graph image: name, tagline, pixel accent. */
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
          background: "#f9f9f9",
          color: "#1a1c1c",
          padding: 72,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 14, height: 14, background: "#00453c" }} />
          <div
            style={{
              fontSize: 24,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#5d5f63",
            }}
          >
            {appConfig.name}
          </div>
        </div>
        <div
          style={{
            fontSize: 68,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            maxWidth: 940,
            fontWeight: 500,
          }}
        >
          {appConfig.tagline}
        </div>
        <div style={{ fontSize: 22, color: "#5d5f63" }}>
          {appConfig.brandClaim}
        </div>
      </div>
    ),
    { ...size }
  );
}
