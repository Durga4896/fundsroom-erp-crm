"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
}
const generateToken = (userId, role) => {
    return jsonwebtoken_1.default.sign({
        userId,
        role,
    }, JWT_SECRET, {
        expiresIn: "1d",
    });
};
exports.generateToken = generateToken;
//# sourceMappingURL=jwt.js.map