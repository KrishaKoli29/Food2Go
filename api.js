import axios from "axios";
import Constants from "expo-constants";

const debuggerHost =
  Constants.expoConfig?.hostUri ||
  Constants.manifest?.debuggerHost ||
  Constants.manifest2?.extra?.expoClient?.hostUri;

const host = debuggerHost
  ? debuggerHost.split(":")[0]
  : "127.0.0.1";

const api = axios.create({
  baseURL: `http://${host}:5000`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("Food2Go API request timed out.");
    } else if (!error.response) {
      console.error(
        "Cannot connect to Food2Go backend. Check the server and network."
      );
    }

    return Promise.reject(error);
  }
);

export default api;