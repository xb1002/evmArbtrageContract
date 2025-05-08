type Matrix3D<T = any> = T[][][];
type Matrix2D<T = any> = T[][];
function create3DMatrix<T>(size: number): Matrix3D<T> {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [] as T[])
  );
}
function create2DMatrix<T>(size: number): Matrix2D<T> {
  return Array.from({ length: size }, () => [] as T[]);
}
function transpose<T>(matrix: Matrix2D<T>): Matrix2D<T> {
  // 边界检查：空矩阵直接返回
  if (matrix.length === 0 || matrix[0].length === 0) return [];
  // 核心逻辑：将原矩阵的列转换为行
  return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
}
function vectorMultiply(
  vector1: Array<number>,
  vector2: Array<number>
): Array<number> {
  if (vector1.length !== vector2.length) {
    throw new Error("Vectors must have the same length");
  }
  return vector1.map((value, index) => value * vector2[index]);
}

export {
  Matrix2D,
  Matrix3D,
  create2DMatrix,
  create3DMatrix,
  transpose,
  vectorMultiply,
};
