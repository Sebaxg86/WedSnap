const TOKEN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function generateQrToken(length = 18) {
  const tokenLength = Math.max(length, 12)
  const values = new Uint32Array(tokenLength)

  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values)
  } else {
    for (let index = 0; index < tokenLength; index += 1) {
      values[index] = Math.floor(Math.random() * TOKEN_CHARS.length)
    }
  }

  let result = ''

  for (let index = 0; index < tokenLength; index += 1) {
    result += TOKEN_CHARS[values[index] % TOKEN_CHARS.length]
  }

  return result
}
