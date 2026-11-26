export function cosineSimilarity(left, right) {
  if (!left || !right || left.length !== right.length || left.length === 0) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  return leftNorm === 0 || rightNorm === 0
    ? 0
    : dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function normalizeTensorRows(tensor) {
  if (!tensor) return [];
  if (typeof tensor.tolist === 'function') {
    const rows = tensor.tolist();
    if (!Array.isArray(rows)) return [];
    if (rows.length > 0 && typeof rows[0] === 'number') return [rows];
    return rows;
  }
  const data = tensor.data;
  const dims = tensor.dims;
  if (!data || !Array.isArray(dims) || dims.length !== 2) return [];
  const [rows, columns] = dims;
  const output = [];
  for (let row = 0; row < rows; row += 1) {
    output.push(Array.from(data.slice(row * columns, (row + 1) * columns)));
  }
  return output;
}

export function normalizeRows(rows) {
  return rows.map(row => {
    const vector = Array.from(row || [], Number);
    let sum = 0;
    for (const value of vector) sum += value * value;
    const norm = Math.sqrt(sum);
    return norm > 0 ? vector.map(value => value / norm) : vector;
  });
}
