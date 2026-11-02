export type Role = "customer" | "rider" | "admin" | "store_owner";

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  status: string;
  profileImage: string | null;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
};

export type MessageResponse = { message: string };

export type RegisterCustomerInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginInput = {
  email: string;
  password: string;
  otp?: string;
};

export type ResetPasswordInput = {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
};
