import '@testing-library/jest-dom'

if (!globalThis.crypto) {
  ;(globalThis as typeof globalThis & { crypto: Crypto }).crypto = {
    randomUUID: () => 'vitest-uuid',
  }
} else if (!globalThis.crypto.randomUUID) {
  ;(globalThis.crypto as Crypto & { randomUUID?: () => string }).randomUUID = () => 'vitest-uuid'
}

if (!('IS_REACT_ACT_ENVIRONMENT' in globalThis)) {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
}
