import React from 'react';
import type { Point, StoneType, BoardMark } from '../types/game';
interface GoBoardProps {
    size?: number;
    stones: Map<string, StoneType>;
    marks?: BoardMark[];
    onIntersectionClick?: (point: Point) => void;
    showHover?: boolean;
    nextPlayer?: StoneType;
    width?: number;
    height?: number;
}
declare const _default: React.FunctionComponent<GoBoardProps>;
export default _default;
