declare class LawyerAuthService {
    register(input: {
        email: string;
        password: string;
        name: string;
        phone: string;
        barNumber: string;
        barCouncilState: string;
        practiceAreas?: string[];
        yearsOfExperience?: number;
    }): Promise<{
        lawyer: {
            id: string;
            email: string;
            name: string;
            barCouncilState: string;
            verificationStatus: import("@prisma/client").$Enums.VerificationStatus;
        };
        verificationStatus: string;
        validationErrors: import("../../../utils/validator.js").ValidationError[] | undefined;
        message: string;
    }>;
    verifyEmail(email: string, otp: string): Promise<{
        id: string;
        email: string;
        name: string;
        verificationStatus: import("@prisma/client").$Enums.VerificationStatus;
    }>;
    loginStep1(email: string, password: string): Promise<{
        requiresTwoFactor: boolean;
        twoFactorToken: string;
        message: string;
    }>;
    loginStep2(twoFactorToken: string, otp: string, ipAddress?: string): Promise<{
        lawyer: {
            id: string;
            email: string;
            name: string;
            userType: string;
            verificationStatus: import("@prisma/client").$Enums.VerificationStatus;
            barCouncilState: string;
            practiceAreas: string[];
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(lawyerId: string, refreshToken: string): Promise<void>;
    requestPasswordReset(email: string): Promise<{
        message: string;
    }>;
    resetPassword(email: string, otp: string, newPassword: string): Promise<{
        message: string;
    }>;
    private handleFailedLogin;
    private storeRefreshToken;
}
export declare const lawyerAuthService: LawyerAuthService;
export default lawyerAuthService;
//# sourceMappingURL=lawyerauth.service.d.ts.map