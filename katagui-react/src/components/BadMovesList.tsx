import React from 'react';
import { observer } from 'mobx-react-lite';
import { gameStore } from '../store/gameStoreMobx';

interface BadMovesListProps {
  onMoveClick: (moveNumber: number) => void;
}

const BadMovesList: React.FC<BadMovesListProps> = ({ onMoveClick }) => {
  const store = gameStore;

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
    <div style={{ 
      width: '280px', 
      height: '500px',
      border: '1px solid #ddd', 
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px',
        borderBottom: '1px solid #ddd',
        backgroundColor: '#fff',
        fontWeight: 'bold',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Bad Moves ({store.badMoves.length})</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
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
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        padding: '8px'
      }}>
        {store.badMoves.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#6c757d', 
            marginTop: '20px',
            fontSize: '14px'
          }}>
            No bad moves found!<br />
            <span style={{ fontSize: '12px' }}>Lower the threshold to see more moves</span>
          </div>
        ) : (
          store.badMoves.map((badMove, index) => (
            <div
              key={`${badMove.moveNumber}-${badMove.move.mv}`}
              onClick={() => onMoveClick(badMove.moveNumber)}
              style={{
                padding: '8px 12px',
                marginBottom: '4px',
                backgroundColor: '#fff',
                border: '1px solid #e9ecef',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontSize: '13px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>
                    {getPlayerColor(badMove.moveNumber)}{badMove.moveNumber}
                  </span>
                  <span style={{ marginLeft: '8px' }}>
                    {badMove.move.mv.toUpperCase()}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    color: getBadnessColor(badMove.badness),
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}>
                    {badMove.badness.toFixed(1)}
                  </div>
                  <div style={{ 
                    color: getBadnessColor(badMove.badness),
                    fontSize: '10px',
                    fontWeight: '500'
                  }}>
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