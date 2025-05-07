import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Safely parses a timestamp of various possible formats into a Date object
 * This function handles all common timestamp formats including Firestore timestamps
 */
export const parseTimestamp = (timestamp: any): Date | null => {
    try {
        // Case 1: timestamp is null or undefined
        if (!timestamp) {
            return null;
        }

        // Case 2: timestamp is already a Date object
        if (timestamp instanceof Date) {
            return timestamp;
        }
        // Case 3: timestamp is a Firestore timestamp object with toDate method
        else if (timestamp && typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
        }
        // Case 4: timestamp is a Firestore timestamp object with seconds and nanoseconds
        else if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
            return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
        }
        // Case 5: timestamp is a number (Unix timestamp)
        else if (typeof timestamp === 'number') {
            // Check if it's seconds (10 digits) or milliseconds (13 digits)
            return new Date(timestamp.toString().length < 13 ? timestamp * 1000 : timestamp);
        }
        // Case 6: timestamp is a string (ISO date or other format)
        else if (typeof timestamp === 'string') {
            return new Date(timestamp);
        }

        return null;
    } catch (error) {
        console.error("Error parsing date:", error, "Raw value:", timestamp);
        return null;
    }
};

/**
 * Format just the time portion (HH'h')
 */
export const formatTime = (date: Date | any): string => {
    try {
        // First parse the date if it's not already a Date object
        const parsedDate = parseTimestamp(date);

        if (!parsedDate || isNaN(parsedDate.getTime())) return "N/A";
        return format(parsedDate, "HH'h'", { locale: fr });
    } catch (error) {
        console.error("Error formatting time:", error);
        return "N/A";
    }
};

/**
 * Format date with the given format string and fallback message
 */
export const formatDate = (date: Date | any, formatStr = "dd MMMM yyyy", fallbackMsg = "Date non définie"): string => {
    try {
        // First parse the date if it's not already a Date object
        const parsedDate = parseTimestamp(date);

        if (!parsedDate || isNaN(parsedDate.getTime())) return fallbackMsg;
        return format(parsedDate, formatStr, { locale: fr });
    } catch (error) {
        console.error("Error formatting date:", error);
        return fallbackMsg;
    }
};

/**
 * Generates a formatted time slot display string
 */
export const formatTimeSlot = (startDate: Date | any, endDate: Date | any, t: Function): string => {
    try {
        // Parse the dates if they're not already Date objects
        const parsedStartDate = parseTimestamp(startDate);
        const parsedEndDate = parseTimestamp(endDate);

        if (!parsedStartDate || !parsedEndDate) {
            return t("delivery.time.undefined") || "Horaire non défini";
        }

        if (isSameDay(parsedStartDate, parsedEndDate)) {
            // Same day delivery
            const dateStr = formatDate(parsedStartDate);
            const startTimeStr = formatTime(parsedStartDate);
            const endTimeStr = formatTime(parsedEndDate);
            return `${t("delivery.time.onDay")} ${dateStr} ${t("delivery.time.between")} ${startTimeStr} ${t("delivery.time.and")} ${endTimeStr}`;
        } else {
            // Multi-day delivery
            const startDateStr = formatDate(parsedStartDate);
            const startTimeStr = formatTime(parsedStartDate);
            const endDateStr = formatDate(parsedEndDate);
            const endTimeStr = formatTime(parsedEndDate);
            return `${t("delivery.time.from")} ${startDateStr} ${t("delivery.time.at")} ${startTimeStr} ${t("delivery.time.to")} ${endDateStr} ${t("delivery.time.at")} ${endTimeStr}`;
        }
    } catch (error) {
        console.error("Error formatting time slot:", error);
        return t("delivery.time.undefined") || "Horaire non défini";
    }
};