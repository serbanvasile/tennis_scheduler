import React, { useState } from 'react';
import { View, Image, ViewStyle, ImageStyle, Platform } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Buffer } from 'buffer';

interface RemoteImageProps {
    uri?: string;
    svgContent?: string;  // Cached SVG content for offline display
    width: number;
    height: number;
    style?: ViewStyle | ImageStyle;
    circular?: boolean;
    onError?: () => void;
    onLoad?: () => void;
}

/**
 * A reusable component that displays remote images including SVGs.
 * 
 * If svgContent is provided, it renders the cached SVG directly (offline capable).
 * Otherwise, it loads from the URI.
 * 
 * The component returns null if there's an error or no valid content.
 */
export const RemoteImage: React.FC<RemoteImageProps> = ({
    uri,
    svgContent,
    width,
    height,
    style,
    circular = false,
    onError,
    onLoad
}) => {
    const [error, setError] = useState(false);

    const borderRadius = circular ? width / 2 : 0;

    const containerStyle: ViewStyle = {
        width,
        height,
        borderRadius,
        overflow: 'hidden',
        ...(style as ViewStyle),
    };

    // Sanitize SVG content to remove non-standard attributes that cause React warnings
    const sanitizeSvg = (svg: string): string => {
        // Remove attributes that React doesn't recognize (dataName, etc.)
        return svg
            .replace(/\s+dataName="[^"]*"/gi, '')
            .replace(/\s+data-name="[^"]*"/gi, '')
            .replace(/\s+xmlns:xlink="[^"]*"/gi, ' ')
            .replace(/\s+xlink:href=/gi, ' href=');
    };

    // Prefer cached SVG content (works offline)
    if (svgContent && svgContent.trim() !== '') {
        const cleanedSvg = sanitizeSvg(svgContent);

        if (Platform.OS === 'web') {
            return (
                <View style={containerStyle}>
                    <Image
                        source={{ uri: `data:image/svg+xml;base64,${Buffer.from(cleanedSvg).toString('base64')}` }}
                        style={{
                            width,
                            height,
                            borderRadius,
                        }}
                        resizeMode="contain"
                    />
                </View>
            );
        }

        return (
            <View style={containerStyle}>
                <SvgXml
                    xml={cleanedSvg}
                    width={width}
                    height={height}
                />
            </View>
        );
    }

    // Fall back to remote loading if no cached content
    if (!uri || uri.trim() === '' || error) {
        return null;
    }

    return (
        <View style={containerStyle}>
            <Image
                source={{ uri }}
                style={{
                    width,
                    height,
                    borderRadius,
                }}
                resizeMode="cover"
                onLoad={() => onLoad?.()}
                onError={() => {
                    setError(true);
                    onError?.();
                }}
            />
        </View>
    );
};

export default RemoteImage;
