// @ts-expect-error: no types
import eslintCommentsPlugin from "eslint-plugin-eslint-comments";
import simpleFilenamesPlugin from "eslint-plugin-filenames-simple";
import importPlugin from "eslint-plugin-import";
import jsdocPlugin from "eslint-plugin-jsdoc";
import sortPlugin from "eslint-plugin-sort";
import unusedImports from "eslint-plugin-unused-imports";
import vitestPlugin from "@vitest/eslint-plugin";
//import type { Config } from 'typescript-eslint'
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, type Config } from "@eslint/config-helpers";
import tsEslint from "typescript-eslint";

export const pluginsConfig = (): Config[] =>
  defineConfig([
    {
      name: "Custom Base Configuration : Included plugins",
      plugins: {
        ["@typescript-eslint"]: tsEslint.plugin,
        ["eslint-comments"]: eslintCommentsPlugin,
        ["filenames-simple"]: simpleFilenamesPlugin,
        ["import"]: importPlugin,
        ["jsdoc"]: jsdocPlugin,
        ["sort"]: sortPlugin,
        ["unused-imports"]: unusedImports,
        ["vitest"]: vitestPlugin,
        //   ['react-hooks']: reactHooks,
        ["react-refresh"]: reactRefresh
      }
    }
  ]);

export default pluginsConfig;
