export interface JwtPayload {
    userId: number;
    role: string;
}
export declare const generateToken: (userId: number, role: string) => string;
//# sourceMappingURL=jwt.d.ts.map