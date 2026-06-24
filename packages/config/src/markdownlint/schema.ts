import type { Configuration as MarkdownLintCoreRules } from 'markdownlint'
import type { OmitIndexSignature } from 'type-fest'
import type {
    OmitKeyDelimiterAliases,
    PlainObject,
} from './../utilities/types.js'

/** This is the rules format from markdownlint packag markdownlintcli2 did not have types */
export type MarkdownlintRuleConfiguration<Bool extends boolean = true> =
    OmitMarkdownlintRuleAliases<
        Omit<
            OmitIndexSignature<MarkdownLintCoreRules>,
            | '$schema'
            | 'customRules'
            | 'extends'
            | 'overrides'
            | 'plugins'
            | 'processor'
            | 'processors'
        >
    >

export type MarkdownlintRuleConfigurationOff = Omit<
    OmitIndexSignature<MarkdownLintCoreRules>,
    | '$schema'
    | 'customRules'
    | 'extends'
    | 'overrides'
    | 'plugins'
    | 'processor'
    | 'processors'
>
type OmitMarkdownlintRuleAliases<Type extends PlainObject> =
    OmitKeyDelimiterAliases<Type, '_', '-'>

const test: MarkdownlintRuleConfiguration = {
    blank_lines: true,
    MD001: true,
    MD013: { code_blocks: false, line_length: 80 },
}

export type MarkdownlintConfiguration = {
    config: MarkdownlintRuleConfiguration
    globs?: Array<string>
    ignores?: Array<string>
}

/** This is the special config format from markdowncli2 */
type MarkdownCli2ConfigType = {
    ignores?: Array<string>
    /** Replaces the default `['**\/*.md']` glob list if provided. */
    includes?: Array<string>
    /** Merged onto `Markdownlint.rules.base()` when `useBaseConfig` is true. */
    rules?: MarkdownlintRuleConfiguration
}
