import React from 'react'

interface QRCodeSVGProps {
  value: string
  size?: number
  className?: string
  bgColor?: string
  fgColor?: string
}

// Pseudo-random but deterministic matrix generator based on string hash
// Creates clean, visually distinct QR-Code 2D matrix patterns for thermal receipt rendering
function generateMatrix(text: string, size = 21): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  // Helper for position detection patterns (the 3 big squares)
  const drawFinderPattern = (row: number, col: number) => {
    for (let r = -3; r <= 3; r++) {
      for (let c = -3; c <= 3; c++) {
        const nr = row + r
        const nc = col + c
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const isBorder = Math.abs(r) === 3 || Math.abs(c) === 3
          const isCenter = Math.abs(r) <= 1 && Math.abs(c) <= 1
          matrix[nr][nc] = isBorder || isCenter
        }
      }
    }
  }

  // Top-left, top-right, bottom-left finders
  drawFinderPattern(3, 3)
  drawFinderPattern(3, size - 4)
  drawFinderPattern(size - 4, 3)

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0
    matrix[i][6] = i % 2 === 0
  }

  // Alignment pattern in bottom-right area
  const alignR = size - 7
  const alignC = size - 7
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2
      const isCenter = r === 0 && c === 0
      matrix[alignR + r][alignC + c] = isBorder || isCenter
    }
  }

  // Populate data bits deterministically from hash
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
  }

  let bitIndex = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder zones
      const inTopLeft = r < 8 && c < 8
      const inTopRight = r < 8 && c >= size - 8
      const inBottomLeft = r >= size - 8 && c < 8
      const inTiming = r === 6 || c === 6
      const inAlign = r >= size - 9 && r <= size - 5 && c >= size - 9 && c <= size - 5

      if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming && !inAlign) {
        const bit = ((h >>> (bitIndex % 31)) & 1) === 1
        // Also combine with character code if available
        const charCode = text.charCodeAt((r * size + c) % text.length) || 0
        matrix[r][c] = bit !== (charCode % 2 === 0) || (r + c) % 3 === 0
        bitIndex++
      }
    }
  }

  return matrix
}

export const QRCodeSVG: React.FC<QRCodeSVGProps> = ({
  value,
  size = 120,
  className = '',
  bgColor = '#FFFFFF',
  fgColor = '#000000',
}) => {
  const matrixSize = 25
  const matrix = React.useMemo(() => generateMatrix(value, matrixSize), [value])
  const cellSize = size / matrixSize

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`inline-block ${className}`}
      style={{ shapeRendering: 'crispEdges' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={size} height={size} fill={bgColor} />
      {matrix.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.1}
              height={cellSize + 0.1}
              fill={fgColor}
            />
          ) : null,
        ),
      )}
    </svg>
  )
}
