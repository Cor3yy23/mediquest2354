import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

// import these once you create them
// import { getSession, refreshSessionFromToken } from "../utils/auth";

export default function LoginScreen() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [redirectHome, setRedirectHome] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        // temporary placeholder logic
        // later replace this with:
        // if (getSession()) {
        //   setRedirectHome(true);
        //   return;
        // }
        //
        // const session = await refreshSessionFromToken();
        // if (session) {
        //   setRedirectHome(true);
        // }

        setRedirectHome(false);
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

  if (checkingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#67e8f9" />
        <Text style={styles.loadingText}>Loading MediQuest...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#f3df72", "#0d3ecb"]} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.kicker}>By North Oaks Health Systems</Text>

        <Image
          source={require("../assets/images/northoaks.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <Text style={styles.title}>MEDIQUEST</Text>

        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/signin")}
          >
            <Text style={styles.buttonText}>SIGN IN</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/create-account")}
          >
            <Text style={styles.buttonText}>REGISTER</Text>
          </TouchableOpacity>
        </View>
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
    width: "88%",
    maxWidth: 420,
    backgroundColor: "rgba(27, 55, 140, 0.82)",
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 10,
  },
  kicker: {
    color: "#c7edf3",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 14,
    textAlign: "center",
  },
  logoImage: {
    width: 115,
    height: 115,
    marginBottom: 18,
  },
  title: {
    color: "#7ee7f5",
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 28,
    textAlign: "center",
  },
  menu: {
    width: "100%",
    gap: 14,
  },
  button: {
    backgroundColor: "#f4d64e",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#0f1f66",
    shadowOpacity: 0.45,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonText: {
    color: "#12308f",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
    fontStyle: "italic",
  },
});