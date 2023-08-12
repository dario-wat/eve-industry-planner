// Helper function for strictly typed filter
function notEmpty(value) {
  return !(value === null || value === undefined)
}

// Strictly typed null filter
export function filterNullOrUndef(arr) {
  return arr.filter(notEmpty)
}
