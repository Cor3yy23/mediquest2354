import * as SecureStore from "expo-secure-store";

const API_BASE = "http://192.168.1.75:5000";

const TOKEN_KEY = "mediquest_token";

export type Session = {
  token: string;
};

type AuthResult = {
  ok: boolean;
  message: string;
};

type RegisterData = {
  email: string;
  password: string;
  displayName: string;
};

export async function getSession(): Promise<Session | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  if (!token) {
    return null;
  }

  return { token };
}

export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          ok: false,
          message: "Invalid email or password.",
        };
      }

      return {
        ok: false,
        message: "Unable to sign in.",
      };
    }

    const data = await response.json();

    await SecureStore.setItemAsync(TOKEN_KEY, data.token);

    return {
      ok: true,
      message: "Signed in successfully.",
    };
  } catch {
    return {
      ok: false,
      message: "Could not connect to the server.",
    };
  }
}

export async function registerAccount(data: RegisterData): Promise<AuthResult> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      }),
    });

    if (!response.ok) {
      let message = "Unable to create account.";

      try {
        const errorData = await response.json();

        if (Array.isArray(errorData) && errorData.length > 0) {
          message = errorData.map((x: any) => x.description).join(" ");
        }
      } catch {
        // keep default message
      }

      return {
        ok: false,
        message,
      };
    }

    return {
      ok: true,
      message: "Account created successfully.",
    };
  } catch {
    return {
      ok: false,
      message: "Could not connect to the server.",
    };
  }
}

export async function getMe() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}