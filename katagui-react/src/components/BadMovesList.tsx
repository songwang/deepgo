import React, { useState, useMemo, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { gameStore } from '../store/gameStoreMobx';

interface BadMovesListProps {
  onMoveClick: (moveNumber: number) => void;
}

type SortOrder = 'badness' | 'moveNumber';

const BadMovesList: React.FC<BadMovesListProps> = ({ onMoveClick }) => {
  const store = gameStore;
  const [sortOrder, setSortOrder] = useState<SortOrder>('badness');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sort bad moves based on selected order
  const sortedBadMoves = useMemo(() => {
    const moves = [...store.badMoves];
    if (sortOrder === 'moveNumber') {
      return moves.sort((a, b) => a.moveNumber - b.moveNumber);
    }
    // Default is already sorted by badness in the store
    return moves;
  }, [store.badMoves, sortOrder]);

  // Reset selection when bad moves change
  useEffect(() => {
    setSelectedIndex(null);
    itemRefs.current = [];
  }, [sortedBadMoves]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sortedBadMoves.length === 0) return;

      let newIndex: number | null = selectedIndex;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        newIndex = selectedIndex === null ? 0 : Math.min(selectedIndex + 1, sortedBadMoves.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        newIndex = selectedIndex === null ? sortedBadMoves.length - 1 : Math.max(selectedIndex - 1, 0);
      }

      if (newIndex !== selectedIndex && newIndex !== null) {
        setSelectedIndex(newIndex);
        onMoveClick(sortedBadMoves[newIndex].moveNumber);
        itemRefs.current[newIndex as number]?.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    };

    const listElement = listRef.current;
    listElement?.addEventListener('keydown', handleKeyDown);

    return () => {
      listElement?.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIndex, sortedBadMoves, onMoveClick]);

  const getPlayerColor = (moveNumber: number): string => {
    // Adjust for handicap games where white plays first after handicap stones
    if (store.handicap >= 2) {
      return moveNumber % 2 === 1 ? 'W' : 'B';
    } else {
      return moveNumber % 2 === 1 ? 'B' : 'W';
    }
  };

  const getBadnessColor = (badness: number): string => {
    if (badness >= 8.0) return '#dc3545'; // Dark red for very bad moves
    if (badness >= 4.0) return '#fd7e14'; // Orange for bad moves
    return '#ffc107'; // Yellow for questionable moves
  };

  const getBadnessLabel = (badness: number): string => {
    if (badness >= 8.0) return 'Blunder';
    if (badness >= 4.0) return 'Mistake';
    return 'Inaccuracy';
  };

  return (
    <div
      ref={listRef}
      tabIndex={0}
      style={{
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        outline: 'none', // Hide focus ring
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #ddd',
          backgroundColor: '#fff',
          fontWeight: 'bold',
          fontSize: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 'normal' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              style={{ fontSize: '12px', padding: '2px 4px' }}
            >
              <option value="badness">By Badness</option>
              <option value="moveNumber">By Move #</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Threshold:</span>
            <select
              value={store.badMovesThreshold}
              onChange={(e) => store.setBadMovesThreshold(Number(e.target.value))}
              style={{ fontSize: '12px', padding: '2px 4px' }}
            >
              <option value={1.0}>1.0</option>
              <option value={2.0}>2.0</option>
              <option value={3.0}>3.0</option>
              <option value={4.0}>4.0</option>
              <option value={5.0}>5.0</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scrollable list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
        }}
      >
        {sortedBadMoves.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#6c757d',
              marginTop: '20px',
              fontSize: '14px',
            }}
          >
            No bad moves found!<br />
            <span style={{ fontSize: '12px' }}>Lower the threshold to see more moves</span>
          </div>
        ) : (
          sortedBadMoves.map((badMove, index) => (
            <div
              key={`${badMove.moveNumber}-${badMove.move.mv}`}
              ref={(el) => (itemRefs.current[index] = el)}
              onClick={() => {
                setSelectedIndex(index);
                onMoveClick(badMove.moveNumber);
              }}
              style={{
                padding: '4px 8px',
                marginBottom: '2px',
                backgroundColor: selectedIndex === index ? '#dee2e6' : '#fff',
                border: '1px solid #e9ecef',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#6c757d', width: '45px' }}>
                    #{badMove.moveNumber}
                  </span>
                  <span style={{ fontWeight: 'bold', width: '25px' }}>
                    {getPlayerColor(badMove.moveNumber)}
                  </span>
                  <span>
                    {badMove.move.mv.toUpperCase()}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      color: getBadnessColor(badMove.badness),
                      fontWeight: 'bold',
                      fontSize: '12px',
                    }}
                  >
                    {badMove.badness.toFixed(1)}
                  </div>
                  <div
                    style={{
                      color: getBadnessColor(badMove.badness),
                      fontSize: '10px',
                      fontWeight: '500',
                    }}
                  >
                    {getBadnessLabel(badMove.badness)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default observer(BadMovesList);