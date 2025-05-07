/**
 * Format a number as currency
 */
export const formatCurrency = (amount: number, currency = 'eur'): string => {
    const formatter = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2
    });

    return formatter.format(amount);
};