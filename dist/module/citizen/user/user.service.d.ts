declare class UserService {
    getUserProfile(userId: string): Promise<any>;
    updateUserProfile(userId: string, data: {
        name?: string;
        avatar?: string;
        preferences?: any;
    }): Promise<{
        id: string;
        email: string;
        name: string | null;
        avatar: string | null;
        preferences: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getUserStats(userId: string): Promise<{
        conversations: number;
        documents: number;
        translations: number;
    }>;
    deleteUser(userId: string): Promise<{
        message: string;
    }>;
}
declare const _default: UserService;
export default _default;
//# sourceMappingURL=user.service.d.ts.map