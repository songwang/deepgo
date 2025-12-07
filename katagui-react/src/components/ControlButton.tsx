import React from 'react';

interface ControlButtonProps {
  onClick?: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
  active?: boolean;
  style?: React.CSSProperties;
}

const ControlButton: React.FC<ControlButtonProps> = ({
  onClick,
  title,
  disabled = false,
  children,
  active = false,
  style: customStyle = {},
}) => {
  const activeColor = '#4CAF50';
  const defaultColor = '#333333';
  const disabledColor = '#BBB199';

  const baseStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    padding: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: disabled ? disabledColor : (active ? activeColor : defaultColor),
  };

  const mergedStyle = { ...baseStyle, ...customStyle };

  return (
    <button onClick={onClick} title={title} disabled={disabled} style={mergedStyle}>
      {children}
    </button>
  );
};

export default ControlButton;
