import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { getSession, registerAccount, signIn } from "../utils/auth";

export default function CreateAccountScreen() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [redirectHome, setRedirectHome] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [role, setRole] = useState<"parent" | "child">("parent");

  const [statusText, setStatusText] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const session = await getSession();
        if (session) {
          setRedirectHome(true);
        }
      } finally {
        setCheckingSession(false);
      }
    }

    checkSession();
  }, []);

  useEffect(() => {
    if (redirectHome) {
      router.replace("/(tabs)");
    }
  }, [redirectHome]);

  async function handleSubmit() {
    const safeDisplayName = displayName.trim();
    const safeEmail = email.trim();

    if (!safeDisplayName || !safeEmail || !password || !passwordConfirm) {
      setStatusText("Please fill out all fields.");
      setIsError(true);
      return;
    }

    if (password.length < 6 || passwordConfirm.length < 6) {
      setStatusText("Password must be at least 6 characters.");
      setIsError(true);
      return;
    }

    if (password !== passwordConfirm) {
      setStatusText("Passwords do not match.");
      setIsError(true);
      return;
    }

    const result = await registerAccount({
      email: safeEmail,
      password,
      displayName: safeDisplayName,
      role, // 👈 this now includes parent/child
    });

    if (!result.ok) {
      setStatusText(result.message);
      setIsError(true);
      return;
    }

    const loginResult = await signIn(safeEmail, password);

    if (!loginResult.ok) {
      setStatusText(
        `Account created. Please sign in manually. ${loginResult.message}`
      );
      setIsError(true);
      return;
    }

    setStatusText("Account created! Entering MediQuest...");
    setIsError(false);

    setTimeout(() => {
      router.replace("/(tabs)");
    }, 250);
  }

  if (checkingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7ee7f5" />
        <Text style={styles.loadingText}>Loading MediQuest...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#f3df72", "#0d3ecb"]} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>MediQuest Registration</Text>

        <Text style={styles.heading}>Create Account</Text>
        <Text style={styles.copy}>
          Create a Parent or Child account to start tracking quests.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter display name"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Enter email"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter password"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
            placeholder="Confirm password"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Account Type</Text>

<View style={styles.roleContainer}>
  <TouchableOpacity
    style={[
      styles.roleButton,
      role === "parent" && styles.roleButtonActive,
    ]}
    onPress={() => setRole("parent")}
  >
    <Text
      style={[
        styles.roleText,
        role === "parent" && styles.roleTextActive,
      ]}
    >
      Parent
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.roleButton,
      role === "child" && styles.roleButtonActive,
    ]}
    onPress={() => setRole("child")}
  >
    <Text
      style={[
        styles.roleText,
        role === "child" && styles.roleTextActive,
      ]}
    >
      Child
    </Text>
  </TouchableOpacity>
</View>
        </View>

        {!!statusText && (
          <Text style={[styles.status, isError && styles.statusError]}>
            {statusText}
          </Text>
        )}

        <Text style={styles.linkRow}>
          Already have an account?{" "}
          <Link href="/signin" style={styles.link}>
            Back to Sign In
          </Link>
        </Text>

        <Text style={styles.linkRow}>
          <Link href="/login" style={styles.link}>
            Back to Title Screen
          </Link>
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    marginTop: 12,
    fontSize: 16,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "90%",
    maxWidth: 430,
    backgroundColor: "rgba(17, 24, 39, 0.82)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  eyebrow: {
    color: "#cbd5e1",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
  },
  heading: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  copy: {
    color: "#cbd5e1",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 22,
  },
  form: {
    gap: 8,
  },
  label: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
  },
  input: {
    backgroundColor: "#0f172a",
    color: "white",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  pickerWrap: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    overflow: "hidden",
  },
  picker: {
    color: "white",
  },
roleContainer: {
  flexDirection: "row",
  gap: 10,
  marginTop: 6,
},

roleButton: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 12,
  backgroundColor: "#0f172a",
  borderWidth: 1,
  borderColor: "#334155",
  alignItems: "center",
},

roleButtonActive: {
  backgroundColor: "#f4d64e",
  borderColor: "#f4d64e",
},

roleText: {
  color: "#cbd5e1",
  fontWeight: "600",
},

roleTextActive: {
  color: "#12308f",
  fontWeight: "900",
},





  button: {
    backgroundColor: "#f4d64e",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#12308f",
    fontSize: 16,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  status: {
    marginTop: 16,
    textAlign: "center",
    color: "#bbf7d0",
    fontSize: 14,
  },
  statusError: {
    color: "#fecaca",
  },
  linkRow: {
    marginTop: 14,
    textAlign: "center",
    color: "#e2e8f0",
    fontSize: 14,
  },
  link: {
    color: "#7ee7f5",
    fontWeight: "600",
  },
});