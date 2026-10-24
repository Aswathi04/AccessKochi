import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#012624", position: "relative" }}>
        <div style={{ position: "absolute", left: "18%", top: "18%", width: "64%", height: "64%", borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #edfffe 0%, #8ff0e8 28%, #00827c 62%, #003734 100%)" }} />
        <div style={{ display: "flex", color: "#012624", fontSize: 180 * 0.22, fontWeight: 600, letterSpacing: 1 }}>AK</div>
      </div>
    ),
    size,
  );
}
