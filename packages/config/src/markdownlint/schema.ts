export type MarkdownlintRuleConfiguration = Record<
    string,
    boolean | Record<string, unknown>
>
export type MarkdownlintConfiguration = {
    config: MarkdownlintRuleConfiguration
    ignores?: Array<string>
    globs?: Array<string>
}
