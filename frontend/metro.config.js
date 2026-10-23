// Resolve and advertise Metro packager on active host IP across Ethernet, Wi-Fi, and Hotspot
const os = require("os");
const { execSync } = require("child_process");

function getActiveIPv4List() {
  const interfaces = os.networkInterfaces();
  const list = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const iface of addrs || []) {
      if (
        iface.family === "IPv4" &&
        !iface.internal &&
        !iface.address.startsWith("127.") &&
        !iface.address.startsWith("169.254.")
      ) {
        list.push({ name, address: iface.address });
      }
    }
  }
  return list;
}

function resolveActiveHostIp() {
  const activeIps = getActiveIPv4List();
  const activeAddresses = activeIps.map((i) => i.address);

  // If user explicitly passed an IP and it actually exists on an active interface, respect it
  const explicitIp = process.env.EXPO_PACKAGER_HOSTNAME || process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
  if (explicitIp && activeAddresses.includes(explicitIp)) {
    return explicitIp;
  }

  // 1. Try lan-network (Expo CLI's built-in resolver)
  try {
    const lan = require("lan-network").lanNetworkSync();
    if (lan && lan.address && activeAddresses.includes(lan.address)) {
      return lan.address;
    }
  } catch (_) {}

  // 2. On Windows, query active default gateway interface
  if (process.platform === "win32") {
    try {
      const routeOut = execSync("route print 0.0.0.0", { encoding: "utf8", timeout: 1500 });
      const match = routeOut.match(/0\.0\.0\.0\s+0\.0\.0\.0\s+\S+\s+(\d+\.\d+\.\d+\.\d+)/);
      if (match && match[1] && activeAddresses.includes(match[1])) {
        return match[1];
      }
    } catch (_) {}
  }

  // 3. Filter out virtual / Hyper-V / WSL / container interfaces
  const physicalCandidates = activeIps.filter(
    (item) => !/vEthernet|wsl|hyper-v|virtualbox|vmware|docker|tailscale|loopback/i.test(item.name)
  );

  // 4. Prioritize Ethernet, Wi-Fi, or Hotspot
  const preferred =
    physicalCandidates.find((c) => /ethernet|eth|en\d/i.test(c.name)) ||
    physicalCandidates.find((c) => /wi-?fi|wlan|wireless/i.test(c.name)) ||
    physicalCandidates.find((c) => /hotspot|local area/i.test(c.name)) ||
    physicalCandidates[0] ||
    activeIps[0];

  return preferred ? preferred.address : "127.0.0.1";
}

const targetIp = resolveActiveHostIp();
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = targetIp;
process.env.EXPO_PACKAGER_HOSTNAME = targetIp;

console.log(`\n🌐 [SilageGuard Metro] Bound to active host IP: ${targetIp} (Port: 8081)\n`);

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Enable wasm assets for expo-sqlite web support
config.resolver.assetExts.push("wasm");

config.server = {
  ...config.server,
  port: 8081,
};

module.exports = config;
