declare class FirebaseAuthService {
    citizenGoogleLogin(idToken: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
            avatar: string | null;
            userType: string;
            provider: string;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    lawyerGoogleLogin(idToken: string, additionalData?: {
        phone?: string;
        barNumber?: string;
        barCouncilState?: string;
        practiceAreas?: string[];
        yearsOfExperience?: number;
    }): Promise<{
        requiresTwoFactor: boolean;
        twoFactorToken: string;
        profileComplete: boolean;
        message: string;
    }>;
}
export declare const firebaseAuthService: FirebaseAuthService;
export default firebaseAuthService;
//# sourceMappingURL=firebase-auth.service.d.ts.map