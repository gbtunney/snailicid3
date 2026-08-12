import CliTable from 'cli-table3'
import { styleText } from './terminal.js'

export type TableOptions = {
    border?: boolean
    head?: ReadonlyArray<string>
    padding?: number
    preset?: TablePreset
    widths?: ReadonlyArray<null | number>
}

export type TablePreset = 'default' | 'header' | 'plain'

export type TableRow = ReadonlyArray<
    bigint | boolean | null | number | string | undefined
>

/** Render rows as a Unicode terminal table. */
export const table = (
    rows: ReadonlyArray<TableRow>,
    options: TableOptions = {},
): string => {
    const border =
        options.border ??
        (options.preset === 'header' || options.preset === 'plain'
            ? false
            : true)
    const chars = !border
        ? {
              'bottom': '',
              'bottom-left': '',
              'bottom-mid': '',
              'bottom-right': '',
              'left': '',
              'left-mid': '',
              'mid': '',
              'mid-mid': '',
              'middle': '',
              'right': '',
              'right-mid': '',
              'top': '',
              'top-left': '',
              'top-mid': '',
              'top-right': '',
          }
        : undefined
    const padding = Math.max(
        0,
        options.padding ?? (options.preset === 'plain' ? 0 : 1),
    )
    const head = options.head?.map((value) =>
        options.preset === 'header'
            ? styleText(` ${value} `, 'bold-bg-grey-700')
            : value,
    )
    const output = new CliTable({
        ...(chars === undefined ? {} : { chars }),
        ...(options.widths === undefined
            ? {}
            : { colWidths: [...options.widths] }),
        head,
        style: {
            'head': [],
            'padding-left': padding,
            'padding-right': padding,
        },
    })

    output.push(...rows.map((row) => [...row]))
    return output.toString()
}
