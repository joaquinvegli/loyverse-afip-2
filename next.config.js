// next.config.js

const fs = require("fs");

function loadStackblitzEnv() {
  const file = "env.local"; // sin punto
  if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    for (const line of lines) {
      const [key, value] = line.split("=");
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  }
}

if (process.env.STACKBLITZ_HOST) {
  loadStackblitzEnv();
}

module.exports = {
  reactStrictMode: true,
};
