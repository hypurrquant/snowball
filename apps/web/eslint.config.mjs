import nextPlugin from "@next/eslint-plugin-next";
import tsParser from "@typescript-eslint/parser";

export default [
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
        },
        plugins: nextPlugin.configs.recommended.plugins,
        rules: nextPlugin.configs.recommended.rules,
    },
    {
        files: ["**/*.{js,jsx}"],
        plugins: nextPlugin.configs.recommended.plugins,
        rules: nextPlugin.configs.recommended.rules,
    },
    {
        ignores: [".next/**"],
    },
];
