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
import { getSession, signIn } from "../utils/auth";

export default function SignInScreen() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [redirectHome, setRedirectHome] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    const result = await signIn(email.trim(), password);

    if (!result.ok) {
      setStatusText(result.message);
      setIsError(true);
      return;
    }

    setStatusText("Success! Entering MediQuest...");
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
        <Text style={styles.eyebrow}>
          MediQuest: By North Oaks Health Systems
        </Text>

        <Text style={styles.heading}>Sign In</Text>
        <Text style={styles.copy}>
          Use your account to enter the game dashboard.
        </Text>

        <View style={styles.form}>
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

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Press Enter to Start</Text>
          </TouchableOpacity>
        </View>

        {!!statusText && (
          <Text style={[styles.status, isError && styles.statusError]}>
            {statusText}
          </Text>
        )}

        <Text style={styles.linkRow}>
          Need an account?{" "}
          <Link href="/create-account" style={styles.link}>
            Create Account
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
  button: {
    backgroundColor: "#f4d64e",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
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