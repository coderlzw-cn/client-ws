import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import cleaner from "rollup-plugin-cleaner";
import {terser} from "rollup-plugin-terser";

export default {
    input: "src/index.ts",
    output: [
        {
            file: "dist/index.js",
            format: "iife",
            name: "store"
        },
        {
            file: "dist/index.esm.js",
            format: "esm"
        }
    ],
    plugins: [
        cleaner({
            targets: ["./dist/"]
        }),
        resolve(),
        commonjs(),
        typescript({
            useTsconfigDeclarationDir: true
        }),
        terser() // 压缩代码
    ]
};