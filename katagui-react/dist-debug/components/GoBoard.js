import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useEffect, useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { pointToPixel, pixelToPoint, isValidPoint } from '../services/coordinateUtils';
const GoBoard = ({ size = 19, stones, marks = [], onIntersectionClick, showHover = true, nextPlayer = 'black', width = 600, height = 600, }) => {
    const canvasRef = useRef(null);
    const [hoverPoint, setHoverPoint] = useState(null);
    // Calculate cell size based on canvas dimensions
    const cellSize = Math.min(width, height) / (size + 1);
    const offset = cellSize;
    // Star points for different board sizes
    const getStarPoints = () => {
        if (size === 19) {
            return [
                { row: 3, col: 3 }, { row: 3, col: 9 }, { row: 3, col: 15 },
                { row: 9, col: 3 }, { row: 9, col: 9 }, { row: 9, col: 15 },
                { row: 15, col: 3 }, { row: 15, col: 9 }, { row: 15, col: 15 },
            ];
        }
        else if (size === 13) {
            return [
                { row: 3, col: 3 }, { row: 3, col: 9 },
                { row: 6, col: 6 },
                { row: 9, col: 3 }, { row: 9, col: 9 },
            ];
        }
        else if (size === 9) {
            return [
                { row: 2, col: 2 }, { row: 2, col: 6 },
                { row: 4, col: 4 },
                { row: 6, col: 2 }, { row: 6, col: 6 },
            ];
        }
        return [];
    };
    const pointToKey = (point) => `${point.row},${point.col}`;
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // Enable anti-aliasing for smooth circles
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        // Draw board background
        ctx.fillStyle = '#DCB35C';
        ctx.fillRect(0, 0, width, height);
        // Draw grid lines
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < size; i++) {
            // Horizontal lines (offset by 0.5 for crisp rendering)
            ctx.beginPath();
            ctx.moveTo(offset, Math.floor(offset + i * cellSize) + 0.5);
            ctx.lineTo(offset + (size - 1) * cellSize, Math.floor(offset + i * cellSize) + 0.5);
            ctx.stroke();
            // Vertical lines (offset by 0.5 for crisp rendering)
            ctx.beginPath();
            ctx.moveTo(Math.floor(offset + i * cellSize) + 0.5, offset);
            ctx.lineTo(Math.floor(offset + i * cellSize) + 0.5, offset + (size - 1) * cellSize);
            ctx.stroke();
        }
        // Draw star points
        const starPoints = getStarPoints();
        ctx.fillStyle = '#3a3a3a';
        starPoints.forEach((point) => {
            const { x, y } = pointToPixel(point, cellSize);
            // Round to match grid line positions for precise centering
            const centerX = Math.floor(offset + x) + 0.5;
            const centerY = Math.floor(offset + y) + 0.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY, cellSize * 0.11, 0, 2 * Math.PI);
            ctx.fill();
        });
        // Draw stones
        const stoneRadius = cellSize * 0.45;
        stones.forEach((stoneType, key) => {
            const [row, col] = key.split(',').map(Number);
            const point = { row, col };
            const { x, y } = pointToPixel(point, cellSize);
            // Draw stone shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(offset + x + 2, offset + y + 2, stoneRadius, 0, 2 * Math.PI);
            ctx.fill();
            // Draw stone
            if (stoneType === 'black') {
                const gradient = ctx.createRadialGradient(offset + x - stoneRadius * 0.3, offset + y - stoneRadius * 0.3, stoneRadius * 0.2, offset + x, offset + y, stoneRadius);
                gradient.addColorStop(0, '#666');
                gradient.addColorStop(1, '#000');
                ctx.fillStyle = gradient;
            }
            else if (stoneType === 'white') {
                const gradient = ctx.createRadialGradient(offset + x - stoneRadius * 0.3, offset + y - stoneRadius * 0.3, stoneRadius * 0.2, offset + x, offset + y, stoneRadius);
                gradient.addColorStop(0, '#fff');
                gradient.addColorStop(1, '#ddd');
                ctx.fillStyle = gradient;
            }
            ctx.beginPath();
            ctx.arc(offset + x, offset + y, stoneRadius, 0, 2 * Math.PI);
            ctx.fill();
            // Add stone outline
            ctx.strokeStyle = stoneType === 'black' ? '#333' : '#aaa';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
        // Draw hover stone (semi-transparent)
        if (showHover && hoverPoint && !stones.has(pointToKey(hoverPoint))) {
            const { x, y } = pointToPixel(hoverPoint, cellSize);
            ctx.globalAlpha = 0.5;
            if (nextPlayer === 'black') {
                ctx.fillStyle = '#333';
            }
            else {
                ctx.fillStyle = '#eee';
            }
            ctx.beginPath();
            ctx.arc(offset + x, offset + y, stoneRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        // Draw marks
        marks.forEach((mark) => {
            const { x, y } = pointToPixel(mark.coord, cellSize);
            const stoneKey = pointToKey(mark.coord);
            const stoneType = stones.get(stoneKey);
            // Determine mark color based on stone color
            ctx.fillStyle = stoneType === 'black' ? '#fff' : '#000';
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 2;
            const markSize = cellSize * 0.3;
            switch (mark.type) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(offset + x, offset + y, markSize, 0, 2 * Math.PI);
                    ctx.stroke();
                    break;
                case 'triangle':
                    ctx.beginPath();
                    ctx.moveTo(offset + x, offset + y - markSize);
                    ctx.lineTo(offset + x - markSize * 0.866, offset + y + markSize * 0.5);
                    ctx.lineTo(offset + x + markSize * 0.866, offset + y + markSize * 0.5);
                    ctx.closePath();
                    ctx.stroke();
                    break;
                case 'square':
                    ctx.strokeRect(offset + x - markSize, offset + y - markSize, markSize * 2, markSize * 2);
                    break;
                case 'cross':
                    ctx.beginPath();
                    ctx.moveTo(offset + x - markSize, offset + y - markSize);
                    ctx.lineTo(offset + x + markSize, offset + y + markSize);
                    ctx.moveTo(offset + x + markSize, offset + y - markSize);
                    ctx.lineTo(offset + x - markSize, offset + y + markSize);
                    ctx.stroke();
                    break;
                case 'letter':
                case 'number': {
                    // Draw background circle with board color to cover grid lines
                    const bgRadius = cellSize * 0.4;
                    ctx.fillStyle = '#DCB35C';
                    ctx.beginPath();
                    ctx.arc(offset + x, offset + y, bgRadius, 0, 2 * Math.PI);
                    ctx.fill();
                    // Draw letter
                    ctx.fillStyle = '#000000';
                    ctx.font = `bold ${cellSize * 0.5}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(mark.value || '', offset + x, offset + y);
                    break;
                }
            }
        });
    }, [size, stones, marks, hoverPoint, showHover, nextPlayer, cellSize, offset, width, height, getStarPoints]);
    // Redraw when dependencies change
    useEffect(() => {
        draw();
    }, [draw]);
    const handleMouseMove = (e) => {
        if (!showHover)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - offset;
        const y = e.clientY - rect.top - offset;
        const point = pixelToPoint(x, y, cellSize, size);
        setHoverPoint(point);
    };
    const handleMouseLeave = () => {
        setHoverPoint(null);
    };
    const handleClick = (e) => {
        if (!onIntersectionClick)
            return;
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - offset;
        const y = e.clientY - rect.top - offset;
        const point = pixelToPoint(x, y, cellSize, size);
        if (point && isValidPoint(point, size) && !stones.has(pointToKey(point))) {
            onIntersectionClick(point);
        }
    };
    return (_jsx("canvas", { ref: canvasRef, width: width, height: height, onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave, onClick: handleClick, style: { cursor: 'pointer', border: '2px solid #8B4513' } }));
};
export default observer(GoBoard);
//# sourceMappingURL=GoBoard.js.map