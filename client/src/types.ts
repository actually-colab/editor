interface LoginDataBase {
  tokenType: string;
}

export interface DevLoginData extends LoginDataBase {
  tokenType: 'dev';
  email: string;
  name?: string;
}

export interface SessionRefreshLoginData extends LoginDataBase {
  tokenType: 'session';
  sessionToken: string;
}

export interface GoogleLoginData extends LoginDataBase {
  tokenType: 'google';
  idToken: string;
}

export type LoginData = DevLoginData | SessionRefreshLoginData | GoogleLoginData;
