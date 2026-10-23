// App icons generated at build time: /icon/192 and /icon/512 (used by manifest.ts).
import { ImageResponse } from "next/og";

export function generateImageMetadata() {
  return [192, 512].map((s) => ({ id: String(s), size: { width: s, height: s }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string> | string }) {
  const s = Number(await id);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f6e5f", color: "#fff", fontSize: s * 0.42, fontWeight: 700 }}>
        AK
      </div>
    ),
    { width: s, height: s },
  );
}
