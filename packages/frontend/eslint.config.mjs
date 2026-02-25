import { dirname } from "path";
import { fileURLToPath } from "url";
import nextPlugin from "@next/eslint-plugin-next";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
    ...nextPlugin.flatConfig,
    {
        // custom rules
    },
];
