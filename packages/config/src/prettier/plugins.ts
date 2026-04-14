import { Plugin as PrettierPlugin } from "prettier";
import xmlPlugin from "@prettier/plugin-xml";
import * as phpPlugin from "@prettier/plugin-php";
import * as unResolvedJsdocPlugin from "prettier-plugin-jsdoc";
import * as shPlugin from "prettier-plugin-sh";
import type { UnknownRecord } from "type-fest";

type KeysOf<ObjectType> = Extract<keyof ObjectType, string>;
export const keysOf = <ObjectType extends UnknownRecord>(
    obj: ObjectType,
): Array<KeysOf<ObjectType>> => Object.keys(obj) as Array<KeysOf<ObjectType>>;

type AnyPrettierPlugin = PrettierPlugin<any>;

type UnresolvedPrettierPlugin<Type extends AnyPrettierPlugin = AnyPrettierPlugin> =
  | Type
  | { default: Type };

type PrettierPluginName =
  | "@prettier/plugin-xml"
  | "@prettier/plugin-php"
  | "prettier-plugin-jsdoc"
  | "prettier-plugin-sh";

const jsDocPlugin: UnresolvedPrettierPlugin = {
    ...unResolvedJsdocPlugin,
  defaultOptions: { ...unResolvedJsdocPlugin.defaultOptions },
  options: unResolvedJsdocPlugin.options,
};

export const resolvePrettierPlugin = (
  moduleValue: UnresolvedPrettierPlugin,
): AnyPrettierPlugin => {
  return "default" in moduleValue ? moduleValue.default : moduleValue;
};

const PRETTIER_PLUGINS = {
  "@prettier/plugin-xml": resolvePrettierPlugin(xmlPlugin),
  "@prettier/plugin-php": resolvePrettierPlugin(phpPlugin),
  "prettier-plugin-jsdoc": resolvePrettierPlugin(jsDocPlugin),
  "prettier-plugin-sh": resolvePrettierPlugin(shPlugin),
} as const satisfies Record<PrettierPluginName, AnyPrettierPlugin>;

export const getPrettierPluginsBundled = (): AnyPrettierPlugin[] => {
  return Object.values(PRETTIER_PLUGINS);
};

export const getPrettierPluginsList = (): Array<PrettierPluginName> => {
  return keysOf(PRETTIER_PLUGINS) as Array<PrettierPluginName>;
};

export const DEFAULT_PRETTIER_PLUGIN_LIST: Array<PrettierPluginName> =
  getPrettierPluginsList();