import type { OmitIndexSignature, SetRequired } from 'type-fest'
import type {
    MarkdownlintCli2ConfigurationSchema,
    MarkdownlintConfigurationSchema,
} from './markdownlint.config.js'

export type MarkdownlintRuleConfiguration = MarkdownlintConfigurationSchema
export type MarkdownlintConfiguration = OmitIndexSignature<
    SetRequired<MarkdownlintCli2ConfigurationSchema, 'config'>
>
