/**
 * Generic search utilities for filtering items based on search chips.
 * This module provides reusable filtering logic that works across all screens.
 */

/**
 * Filters an array of items based on search chips using AND or OR logic.
 * - AND mode: An item matches if ALL chips are found in its searchable text
 * - OR mode: An item matches if ANY chip is found in its searchable text
 * 
 * @param items - Array of items to filter
 * @param chips - Array of search filter chips
 * @param extractSearchableText - Function that converts an item to searchable text string
 * @param mode - Filter mode: 'AND' or 'OR' (default: 'AND')
 * @returns Filtered array of items
 * 
 * @example
 * const filteredEvents = filterItemsByChips(
 *   events,
 *   ['2025', 'Courtside'],
 *   (event) => `${event.name} ${event.venue_names} ${formatDate(event.start_date)}`,
 *   'AND'
 * );
 */
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
            return chips.every((chip) => {
                const normalizedChip = chip.toLowerCase().trim();
                return normalizedChip && searchableText.includes(normalizedChip);
            });
        } else {
            // OR logic: return true if ANY chip matches
            return chips.some((chip) => {
                const normalizedChip = chip.toLowerCase().trim();
                return normalizedChip && searchableText.includes(normalizedChip);
            });
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
