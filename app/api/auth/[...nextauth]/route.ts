import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
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
        async session({ session, token }: { session: any; token: any }) {
            return session;
        },
        async jwt({ token, user }: { token: any; user: any }) {
            return token;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
