import ora, { type Ora } from 'ora'

// Define the return type for the spinner
export type ProgressBar = {
    setText: (text: string) => void
    start: () => void
    stop: () => void
}

export const createProgressBar = (text: string = 'Loading...'): ProgressBar => {
    let spinner: null | Ora = null

    return {
        setText: (newText: string): void => {
            if (spinner) {
                spinner.text = newText
            }
        },
        start: (): void => {
            if (!spinner) {
                spinner = ora({ text }).start()
            }
        },
        stop: (): void => {
            if (spinner) {
                spinner.stop()
                spinner = null
            }
        },
    }
}
