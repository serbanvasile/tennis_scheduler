import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
    size?: number;
    color?: string;
}

// Phone icon
export const PhoneIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            fill={color}
            d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2c.27-.27.66-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.85 21 3 13.15 3 3c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.36.03.75-.25 1.02l-2.2 2.2z"
        />
    </Svg>
);

// Email icon
export const EmailIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            fill={color}
            d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"
        />
    </Svg>
);

// WhatsApp icon
export const WhatsAppIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor' }) => (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <Path
            fill={color}
            d="M16 3C9.38 3 4 8.16 4 14.52c0 2.49.86 4.82 2.34 6.72L5 29l7.98-1.99A12.5 12.5 0 0 0 16 26.04c6.62 0 12-5.16 12-11.52S22.62 3 16 3zm0 20.64c-1.73 0-3.34-.44-4.75-1.2l-.34-.19-4.74 1.18 1.27-4.47-.22-.35a9.43 9.43 0 0 1-1.54-5.09C5.68 9.57 10.26 5.4 16 5.4s10.32 4.17 10.32 9.12S21.74 23.64 16 23.64z"
        />
        <Path
            fill={color}
            d="M22.03 18.32c-.33.92-1.64 1.7-2.6 1.89-.66.13-1.5.23-4.87-1.04-4.3-1.62-7.07-5.58-7.29-5.84-.2-.26-1.74-2.28-1.74-4.34 0-2.06 1.1-3.07 1.49-3.49.39-.42.85-.52 1.13-.52h.82c.26 0 .62-.1.97.74.36.87 1.24 3.02 1.35 3.24.11.22.18.49.04.75-.13.26-.2.42-.39.65-.2.23-.4.51-.57.68-.2.2-.4.42-.18.81.22.39.99 1.62 2.12 2.62 1.46 1.3 2.69 1.7 3.08 1.9.39.2.61.17.84-.1.23-.26.96-1.1 1.22-1.49.26-.39.51-.33.86-.2.36.13 2.27 1.07 2.66 1.26.39.2.65.29.75.46.1.16.1.94-.23 1.86z"
        />
    </Svg>
);

// Signal icon
export const SignalIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor' }) => (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <Path
            fill={color}
            d="M16 3C9.38 3 4 8.16 4 14.52c0 2.26.71 4.37 1.93 6.13L5 29l8.7-2.06c.75.14 1.52.22 2.3.22 6.62 0 12-5.16 12-11.52S22.62 3 16 3zm0 21.76c-.86 0-1.71-.1-2.53-.3l-.38-.09-5.1 1.2 1.36-4.78-.25-.39a9.5 9.5 0 0 1-1.57-5.19C7.53 10.1 11.27 6.8 16 6.8s8.47 3.3 8.47 8.36S20.73 24.76 16 24.76z"
        />
        <Path
            fill={color}
            d="M26.64 7.36a1 1 0 0 1 1.41 0c.6.6 1.14 1.27 1.6 1.98a1 1 0 1 1-1.7 1.06 10.4 10.4 0 0 0-1.3-1.6 1 1 0 0 1 0-1.44zM3.95 20.8a1 1 0 0 1 1.34.45c.37.66.8 1.28 1.28 1.85a1 1 0 0 1-1.53 1.28 12.7 12.7 0 0 1-1.53-2.2 1 1 0 0 1 .44-1.38z"
        />
    </Svg>
);

// Default mobile icon
export const MobileIcon: React.FC<IconProps> = ({ size = 24, color = 'currentColor' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            fill={color}
            d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"
        />
    </Svg>
);
