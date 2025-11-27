/** @type {import('next').NextConfig} */
const fs = require("fs");

let customEnv = {};

try {
  if (fs.existsSync("./env.local")) {
    const lines = fs.readFileSync("./env.local", "utf8").split("\n");
    for (const line of lines) {
      const [key, value] = line.split("=");
      if (key && value) {
        customEnv[key.trim()] = value.trim();
      }
    }
  }
} catch (e) {
  console.log("Error cargando env.local", e);
}

const nextConfig = {
  env: {
    ...customEnv,
  },
};

module.exports = nextConfig;
