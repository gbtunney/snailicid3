import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import duration from 'dayjs/plugin/duration.js'
import utc from 'dayjs/plugin/utc.js'

// Side-effect happens once here — consumers never call dayjs.extend() themselves
dayjs.extend(customParseFormat)
dayjs.extend(utc)
dayjs.extend(duration)

export { default as dayjs, default } from 'dayjs'
