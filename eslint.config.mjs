import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import js from "@eslint/js";

export default [
    {files: ["**/*.{js,mjs,cjs,ts}"]},
    {ignores: ["dist/*"]},
    {languageOptions: {globals: {...globals.browser, ...globals.node}}},
    pluginJs.configs.recommended,
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            // 警告未使用的变量，但忽略以 "_" 开头的变量
            "no-unused-vars": ["warn", {"varsIgnorePattern": "^_", "argsIgnorePattern": "^_"}],
            // 如果有超过 1 行的连续空行则报错
            "no-multiple-empty-lines": ["error", { "max": 1 }],
            // 如果行尾有空格则报错
            "no-trailing-spaces": "error",
            // 强制在语句末尾使用分号
            "semi": ["error", "always"],
            // 强制使用双引号
            "quotes": ["error", "double"],
            // 禁止在对象和数组的最后一个元素后面使用逗号
            "comma-dangle": ["error", "never"],
            "@typescript-eslint/no-explicit-any": "off"
        }
    }
];