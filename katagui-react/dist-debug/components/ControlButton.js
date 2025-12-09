import { jsx as _jsx } from "react/jsx-runtime";
const ControlButton = ({ onClick, title, disabled = false, children, active = false, style: customStyle = {}, }) => {
    const activeColor = '#4CAF50';
    const defaultColor = '#333333';
    const disabledColor = '#BBB199';
    const baseStyle = {
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
    return (_jsx("button", { onClick: onClick, title: title, disabled: disabled, style: mergedStyle, children: children }));
};
export default ControlButton;
//# sourceMappingURL=ControlButton.js.map