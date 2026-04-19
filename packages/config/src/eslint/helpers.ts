import type { RuleConfig } from '@eslint/config-helpers'
/** The human readable severity level used in a configuration. */
export type SeverityName = 'off' | 'warn' | 'error'
/**
 * The numeric severity level for a rule.
 *
 * - `0` means off.
 * - `1` means warn.
 * - `2` means error.
 */
export type SeverityLevel = 0 | 1 | 2
/** The severity of a rule in a configuration. */
export type Severity = SeverityName | SeverityLevel
/** Represents the metadata for an object, such as a plugin or processor. */
export type RuleOptions = RuleConfig | Array<RuleConfig>

/** Typed helper for defining ESLint rules. Preserves the exact rule configuration type. */
export const defineRule = <RuleType extends RuleConfig>(
    ruleConfiguration: RuleType,
): RuleType => ruleConfiguration
type CleanRuleInput = Record<string, Array<unknown> | undefined>

/** TODO: TEST THESE Optional: stricter version (cleaner input) If you want to never write severity in input */
export const rulesWithSeverity = <Type extends CleanRuleInput>(
    severity: 'off' | 'warn' | 'error',
    rules: Type,
): Record<keyof Type, RuleConfig> => {
    return Object.fromEntries(
        Object.entries(rules).map(([name, options]) => {
            return [name, options ? [severity, ...options] : severity]
        }),
    ) as Record<keyof Type, RuleConfig>
}
/** Applies a severity to a rules object. Allows writing rules without repeating 'warn' / 'error'. */
export const withSeverity = <Type extends Record<string, RuleOptions>>(
    severity: 'off' | 'warn' | 'error',
    rules: Type,
): Record<keyof Type, RuleConfig> => {
    return Object.fromEntries(
        Object.entries(rules).map(([name, value]) => {
            if (Array.isArray(value)) {
                // already has options → replace first element
                return [name, [severity, ...value.slice(1)]]
            }
            // no options → just set severity
            return [name, severity]
        }),
    ) as Record<keyof Type, RuleConfig>
}
