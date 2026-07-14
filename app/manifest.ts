import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "learnit",
    short_name: "learnit",
    description: "Spaced repetition for everything you want to remember.",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0d13",
    theme_color: "#6a5ae0",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
