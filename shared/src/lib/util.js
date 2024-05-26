// Helper function for strictly typed filter
export function notEmpty(value) {
  return !(value === null || value === undefined)
}

// Strictly typed null filter
export function filterNullOrUndef(arr) {
  return arr.filter(notEmpty)
}

function debugVal(val) {
  console.log(val);
  return val;
}

global.debugVal = debugVal;