import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#174ea6", position: "relative" }}>
        <div style={{ position: "absolute", left: "18%", top: "18%", width: "64%", height: "64%", borderRadius: "58% 42% 55% 45% / 48% 56% 44% 52%", background: "#f12636" }} />
        <div style={{ display: "flex", color: "#ffffff", fontSize: 180 * 0.22, fontWeight: 600, letterSpacing: 1 }}>AK</div>
      </div>
    ),
    size,
  );
}
