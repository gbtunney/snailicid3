import * as shPlugin from 'prettier-plugin-sh'
type InferPrettierOption<Type> = Type extends { type: 'boolean' }
    ? boolean
    : Type extends { type: 'int' }
      ? number
      : Type extends {
              choices: ReadonlyArray<{ value: infer Value }>
              type: 'choice'
          }
        ? Value
        : Type extends { type: 'path' | 'string' }
          ? undefined
          : unknown

type InferPrettierOptions<Type extends Record<string, unknown>> = {
    [Key in keyof Type]?: InferPrettierOption<Type[Key]>
}
///oh my god i hate this so much lol!!!
if (shPlugin.options !== undefined) {
    /** As NonNullable<typeof shPlugin.options> */
    const shoptions: InferPrettierOptions<typeof shPlugin.options> =
        shPlugin.options
    const ttttt: keyof typeof shoptions = 'varjkjkjkiant'
    const rrrr = shoptions.type ? true : false

    const tttt: InferPrettierOption<typeof shoptions> = '2'
}
