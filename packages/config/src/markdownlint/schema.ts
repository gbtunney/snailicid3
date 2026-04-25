export type MarkdownlintRuleConfiguration = Record<string, boolean | Record<string, unknown>>
export type MarkdownlintConfiguration = {
    config: MarkdownlintRuleConfiguration
    ignores?: string[]
    globs?: string[]
}
