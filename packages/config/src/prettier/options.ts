/**
 * Prettier Configuration
 *
 * @see [Prettier - Opinionated Code Formatter](https://prettier.io/)
 */
import { Config, Options } from "prettier";
import type { Options as JsDocOptions } from "prettier-plugin-jsdoc";
import type { IterableElement, Merge } from "type-fest";
import { getScaledWidth, SHARED_FORMATTING_RULES } from "../shared.js";

export type PrettierOptions = Options & JsDocOptions;
export type PrettierOverrides = Array<
  Merge<IterableElement<Config["overrides"]>, { options: PrettierOptions }>
>;

export type PrettierConfig = Merge<
  Merge<Config, PrettierOptions>,
  {
    overrides: PrettierOverrides;
  }
>;

export const getDefaultOptions = (): PrettierOptions => {
  return {
    bracketSameLine: true,

    /** JS Doc */
    jsdocPrintWidth: getScaledWidth("comments"),
    //packageIgnoreSort: ["scripts"],
    //SHARED_FORMATTING_RULES.tabWidth,
    /**
     * TODO reenabled or remove
     *  packageSortOrder: [
     * "name",
     * "version",
     * "private",
     * "description",
      "scripts",
      "main",
      "module",
      "types",
      "dependencies",
      "devDependencies",
      "type",
      "exports",
      "author",
      "license"
    ],
     */
    printWidth: getScaledWidth("code"),
    proseWrap: "never",

    quoteProps: "consistent",
    semi: false,
    singleQuote: true,
    tabWidth: 4
  } as const;
};

export const getDefaultOverrides: ()=>PrettierOverrides = () =>    [
  /** Override for markdown files only */
  {
    files: "**/*.md",
    options: {
      printWidth: getScaledWidth("markdown"),
      proseWrap: "always",
      tabWidth: SHARED_FORMATTING_RULES.markdownTabWidth
    }
  },
    {
      files: ".husky/*",
      options: {
        parser: "sh"
      }
    }
  
];