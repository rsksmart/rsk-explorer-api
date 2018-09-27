export const reset = '\x1b[0m'
export const red = '\x1b[31m'
export const blue = '\x1b[36m'
export const green = '\x1b[32m'
export const orange = '\x1b[33m'

export const error = l => console.log(red, l, reset)
export const warn = l => console.log(orange, l, reset)
export const info = l => console.log(blue, l, reset)
export const ok = l => console.log(green, l, reset)

export const ansiCode = number => `\x1b[${parseInt(number)}m`

export const randomColor = () => ansiCode(Math.floor(Math.random() * (40 - 30 + 1)) + 30)
