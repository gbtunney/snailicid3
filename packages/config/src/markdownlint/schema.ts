export type MarkdownlintConfiguration = {
    config: MarkdownlintRuleConfiguration
    globs?: Array<string>
    ignores?: Array<string>
}
export type MarkdownlintRuleConfiguration = Record<
    string,
    boolean | Record<string, unknown>
>
