/**
 * Generic search utilities for filtering items based on search chips.
 * This module provides reusable filtering logic that works across all screens.
 */

/**
 * Converts a wildcard pattern to a regex pattern
 * Supports * as wildcard (e.g., "Fri*", "*day", "*ur*")
 */
function wildcardToRegex(pattern: string): RegExp {
    // Escape special regex characters except *
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Replace * with .*
    const regexPattern = escaped.replace(/\*/g, '.*');
    // Match anywhere in the string (case insensitive) - no anchors!
    return new RegExp(regexPattern, 'i');
}

/**
 * Check if a chip matches the searchable text
 * Supports wildcard patterns with *
 */
function chipMatches(chip: string, searchableText: string): boolean {
    const trimmedChip = chip.trim();

    // Check if chip contains wildcard
    if (trimmedChip.includes('*')) {
        const regex = wildcardToRegex(trimmedChip);
        // Match the pattern anywhere in the searchable text (field value)
        return regex.test(searchableText);
    }

    // Plain text search (case insensitive)
    return searchableText.includes(trimmedChip.toLowerCase());
}

export function filterItemsByChips<T>(
    items: T[],
    chips: string[],
    extractSearchableText: (item: T) => string,
    mode: 'AND' | 'OR' = 'AND'
): T[] {
    // If no chips, return all items
    if (chips.length === 0) {
        return items;
    }

    // Filter items based on mode
    return items.filter((item) => {
        const searchableText = extractSearchableText(item).toLowerCase();

        if (mode === 'AND') {
            // AND logic: return true if ALL chips match
            return chips.every((chip) => chipMatches(chip, searchableText));
        } else {
            // OR logic: return true if ANY chip matches
            return chips.some((chip) => chipMatches(chip, searchableText));
        }
    });
}

/**
 * Helper function to format a date timestamp for search.
 * Formats as: "12/19/2025" and "Dec 19 2025" for maximum searchability
 */
export function formatDateForSearch(timestamp: number | null | undefined): string {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString(); // e.g., "12/19/2025"
    const monthName = date.toLocaleDateString('en-US', { month: 'short' }); // e.g., "Dec"
    const day = date.getDate();
    const year = date.getFullYear();

    return `${dateStr} ${monthName} ${day} ${year}`;
}

/**
 * Helper function to format a time timestamp for search.
 * Formats as: "7:30 PM" and "19:30" for maximum searchability
 */
export function formatTimeForSearch(timestamp: number | null | undefined): string {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const time12 = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // e.g., "07:30 PM"
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const time24 = `${hours}:${minutes}`; // e.g., "19:30"

    return `${time12} ${time24}`;
}
