import { NextResponse } from 'next/server';

export interface InstagramAccountConfig {
    id: string;
    name: string;
    userId: string;
    accessToken: string;
}

export type SafeInstagramAccount = Omit<InstagramAccountConfig, 'accessToken'>;

export function getConfiguredInstagramAccounts(): InstagramAccountConfig[] {
    try {
        if (process.env.INSTAGRAM_ACCOUNTS) {
            return JSON.parse(process.env.INSTAGRAM_ACCOUNTS);
        }
    } catch (error) {
        console.error('Failed to parse INSTAGRAM_ACCOUNTS env variable', error);
    }

    // Fallback for legacy configuration
    if (process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_USER_ID) {
        return [
            {
                id: 'default',
                name: 'Instagram Padrão',
                userId: process.env.INSTAGRAM_USER_ID,
                accessToken: process.env.INSTAGRAM_ACCESS_TOKEN
            }
        ];
    }

    return [];
}

export async function GET() {
    try {
        const accounts = getConfiguredInstagramAccounts();

        // Strip sensitive access tokens before sending to the client
        const safeAccounts: SafeInstagramAccount[] = accounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            userId: acc.userId
        }));

        return NextResponse.json(safeAccounts);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch instagram accounts configuration' },
            { status: 500 }
        );
    }
}
