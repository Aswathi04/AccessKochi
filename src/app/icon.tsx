// App icons generated at build time: /icon/192 and /icon/512 (used by manifest.ts).
import { ImageResponse } from "next/og";

export function generateImageMetadata() {
  return [192, 512].map((s) => ({ id: String(s), size: { width: s, height: s }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string> | string }) {
  const s = Number(await id);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#174ea6", position: "relative" }}>
        <div style={{ position: "absolute", left: "18%", top: "18%", width: "64%", height: "64%", borderRadius: "58% 42% 55% 45% / 48% 56% 44% 52%", background: "#f12636" }} />
        <div style={{ display: "flex", color: "#ffffff", fontSize: s * 0.22, fontWeight: 600, letterSpacing: 1 }}>AK</div>
      </div>
    ),
    { width: s, height: s },
  );
}
