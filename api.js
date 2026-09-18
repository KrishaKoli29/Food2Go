import axios from "axios";
import Constants from "expo-constants";

const debuggerHost =
  Constants.expoConfig?.hostUri ||
  Constants.manifest?.debuggerHost;

const host = debuggerHost
  ? debuggerHost.split(":")[0]
  : "127.0.0.1";

const api = axios.create({
  baseURL: `http://${host}:5000`,
});

export default api;