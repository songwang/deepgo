import React from 'react';
interface ControlButtonProps {
    onClick?: () => void;
    title: string;
    disabled?: boolean;
    children: React.ReactNode;
    active?: boolean;
    style?: React.CSSProperties;
}
declare const ControlButton: React.FC<ControlButtonProps>;
export default ControlButton;
