// server/src/utils/password.ts
//
// Generates a temporary password for accounts created on behalf of a user
// (new admins, license owners). Guaranteed to satisfy utils/validation.ts's
// isValidPassword (>=8 chars, at least one letter and one digit) so it never
// gets rejected downstream by Supabase's own password creation call.

import crypto from 'crypto';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'; 
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*';

function randomChar(pool: string): string {
    const idx = crypto.randomInt(0, pool.length);
    return pool[idx];
}

export function generateTempPassword(length = 12): string {
    if (length < 8) {
        throw new Error('Password length must be at least 8 characters.');
    }
    const required = [randomChar(LETTERS), randomChar(DIGITS), randomChar(SYMBOLS)];
    const pool = LETTERS + DIGITS + SYMBOLS;
    const remainingLength = length - required.length;
    const rest = Array.from({ length: remainingLength }, () => randomChar(pool));

    const all = [...required, ...rest];
    for (let i = all.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [all[i], all[j]] = [all[j], all[i]];
    }
    return all.join('');
}