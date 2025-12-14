import React from 'react';

interface CommentBoxProps {
  comment: string;
}

const CommentBox: React.FC<CommentBoxProps> = ({ comment }) => {
  return (
    <div style={{ padding: '16px', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
      {comment ? (
        <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '14px' }}>{comment}</p>
      ) : (
        <p style={{ color: '#6c757d', margin: 0, textAlign: 'center', paddingTop: '20px' }}>No comment for this move.</p>
      )}
    </div>
  );
};

export default CommentBox;
