import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permet de tester depuis le téléphone sur le Wi-Fi de la maison (adresse de l'ordinateur).
  allowedDevOrigins: ["192.168.0.12"],
};

export default nextConfig;
