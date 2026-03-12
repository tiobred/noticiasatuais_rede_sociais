import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                const dashboardPassword = process.env.DASHBOARD_PASSWORD;
                
                if (credentials?.password === dashboardPassword) {
                    return { id: '1', name: 'Admin' };
                }
                return null;
            }
        })
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async session({ session, token }) {
            return session;
        },
        async jwt({ token, user }) {
            return token;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
};
