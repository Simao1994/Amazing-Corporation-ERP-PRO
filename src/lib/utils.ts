
/**
 * Formata um erro para exibição segura na UI, evitando [object Object]
 */
export const formatError = (error: any): string => {
    if (!error) return 'Erro desconhecido';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.error_description) return error.error_description;
    try {
        return JSON.stringify(error);
    } catch (e) {
        return 'Erro não processável';
    }
};

/**
 * Adiciona um timeout a uma Promise
 */
export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    );
    return Promise.race([promise, timeoutPromise]);
};
