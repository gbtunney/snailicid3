export {
  BASE_IGNORES,
  Prettier,
  buildPrettierConfigFunction,
  definePrettierConfig,
} from "./api-functions.js";

export type {
  PrettierConfig,
  PrettierConfigFunctionOptions,
} from "./api-functions.js";

export type { PrettierOptions, PrettierOverrides } from "./options.js";

export { getScaledWidth, SHARED_FORMATTING_RULES } from "../shared.js";
