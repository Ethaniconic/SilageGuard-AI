// Resolve and advertise Metro packager on configured host IP (defaults to 192.168.31.18:8081)
const os = require("os");

function getTargetHostIp() {
  if (process.env.EXPO_PACKAGER_HOSTNAME) {
    return process.env.EXPO_PACKAGER_HOSTNAME;
  }
  if (process.env.REACT_NATIVE_PACKAGER_HOSTNAME) {
    return process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
  }
  return "192.168.31.18";
}

const targetIp = getTargetHostIp();
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = targetIp;
process.env.EXPO_PACKAGER_HOSTNAME = targetIp;

// Verify if configured IP is actually present on an active adapter
const interfaces = os.networkInterfaces();
const activeIps = Object.values(interfaces).flat().map((iface) => iface?.address);
if (targetIp && !activeIps.includes(targetIp) && targetIp !== "localhost" && targetIp !== "127.0.0.1") {
  console.warn(`\n⚠️  [Metro Interface Alert] ${targetIp} is not bound to any active network adapter (Ethernet may be disconnected).`);
  console.warn(`   If mobile phone shows 'Site can't be reached', run 'npm run tunnel' or plug in the Ethernet cable.\n`);
}

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Enable wasm assets for expo-sqlite web support
config.resolver.assetExts.push("wasm");

config.server = {
  ...config.server,
  port: 8081,
};

module.exports = config;
