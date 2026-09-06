import { defineHandler } from "nitro/h3";
import { fetchViteEnv } from "nitro/vite/runtime";

export default defineHandler(({ req }) => fetchViteEnv("ssr", req));
