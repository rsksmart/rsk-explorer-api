export const reset = '\x1b[0m'
export const red = '\x1b[31m'
export const blue = '\x1b[36m'
export const green = '\x1b[32m'
export const orange = '\x1b[33m'
export const grey = '\x1b[90m'

export const error = l => console.log(red, l, reset)
export const warn = l => console.log(orange, l, reset)
export const info = l => console.log(blue, l, reset)
export const ok = l => console.log(green, l, reset)
export const example = l => console.log(grey, l, reset)

export const ansiCode = number => `\x1b[${parseInt(number)}m`

export const randomColor = () => ansiCode(Math.floor(Math.random() * (40 - 30 + 1)) + 30)

export const progressBar = (total, value, options = {}) => {
  let steps = options.steps || 10
  let char = options.char || '■'
  let empty = options.empty || ' '
  let close = options.close || '|'
  let percent = Math.floor(value * 100 / total)
  let bars = [...new Array(steps + 1)]
    .map((v, i) => (i * (100 / steps) < percent) ? char : empty)
  bars.splice(Math.floor(bars.length / 2), 0, ` ${percent}% `)
  return `${close}${bars.join('')}${close}`
}
