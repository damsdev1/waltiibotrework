/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const { defineConfig, globalIgnores } = require("eslint/config");
const tsParser = require("@typescript-eslint/parser");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const js = require("@eslint/js");
const requireExtensions = require("eslint-plugin-require-extensions");
const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

module.exports = defineConfig([
    globalIgnores(["**/dist/**", "**/node_modules/**", "**/generated/**"]),
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js'], // ta base TypeScript/ESM
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: 'module',
        },
    },
    {
        files: ['**/*.cjs'], // ou '**/*.cjs' si tu en as plusieurs
        languageOptions: {
            parser: tsParser, // tu peux réutiliser ton parser
            ecmaVersion: 2022,
            sourceType: 'script', // ou 'module', mais pour CJS 'script' est plus logique
            globals: {
                module: 'writable', // autorise `module.exports`
                require: 'readonly', // optionnel si tu utilises `require`
            },
        },
    },
    {
        plugins: {
            "@typescript-eslint": typescriptEslint,
            "require-extensions": requireExtensions,
        },

        // bring in legacy configs
        extends: compat.extends(
            "eslint:recommended",
            "plugin:@typescript-eslint/recommended",
            "plugin:require-extensions/recommended",
        ),

        rules: {

            "@typescript-eslint/consistent-type-imports": [
                "error",
                {
                    fixStyle: 'separate-type-imports',
                    prefer: 'type-imports',
                }
            ],
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/explicit-function-return-type": "error",
        },

        settings: {
            "import/resolver": {
                node: {
                    extensions: [".js", ".ts", ".tsx"],
                },
            },
        },
    },
    globalIgnores(["**/dist/**", "**/node_modules/**"]),
]);
