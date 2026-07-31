import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** App icon / favicon generated from the Readlane CI mark. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          borderRadius: 15,
          background:
            "linear-gradient(145deg, #9AABC0 0%, #5F7089 40%, #2B313B 100%)",
        }}
      >
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          style={{ position: "absolute", inset: 0 }}
        >
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
    ),
    { ...size }
  );
}
