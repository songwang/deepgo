import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { gameStore } from '../store/gameStoreMobx';
import BadMovesList from './BadMovesList';
import CommentBox from './CommentBox';

type Tab = 'badMoves' | 'comments';

const RightPanelTabs: React.FC<{ onMoveClick: (moveNumber: number) => void }> = observer(({ onMoveClick }) => {
  const [activeTab, setActiveTab] = useState<Tab>('badMoves');
  const store = gameStore;

  const currentComment = store.currentMove?.comment || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '280px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', backgroundColor: '#fff' }}>
        <button
          onClick={() => setActiveTab('badMoves')}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: 'none',
            borderRight: '1px solid #ddd',
            background: activeTab === 'badMoves' ? '#e9ecef' : 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'badMoves' ? 'bold' : 'normal',
            fontSize: '14px',
          }}
        >
          Bad Moves
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: 'none',
            background: activeTab === 'comments' ? '#e9ecef' : 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'comments' ? 'bold' : 'normal',
            fontSize: '14px',
          }}
        >
          Comment
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
        {activeTab === 'badMoves' ? (
          <BadMovesList onMoveClick={onMoveClick} />
        ) : (
          <CommentBox comment={currentComment} />
        )}
      </div>
    </div>
  );
});

export default RightPanelTabs;
