export interface IRegisterUser {
  name: string;
  email: string;
  password: string;
}

export interface ILoginUser {
  email: string;
  password: string;
}

export interface IGoogleLoginPayload {
  idToken: string;
}

export interface IVerifyEmail {
  email: string;
  otp: string;
}

export interface IForgotPassword {
  email: string;
}

export interface IResetPassword {
  email: string;
  otp: string;
  newPassword: string;
}

export interface IResendVerification {
  email: string;
}

export interface IDemoLogin {
  role: "CUSTOMER" | "COURIER" | "ADMIN";
}

export interface IChangePassword {
  currentPassword: string;
  newPassword: string;
}
