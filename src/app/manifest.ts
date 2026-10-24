import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AccessKochi",
    short_name: "AccessKochi",
    description: "Accessible trip planning for Kochi: know before you go.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f0e7",
    theme_color: "#f4f0e7",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
