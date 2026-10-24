import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AccessKochi",
    short_name: "AccessKochi",
    description: "Accessible trip planning for Kochi: know before you go.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#012624",
    theme_color: "#012624",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
