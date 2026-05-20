import { Link, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getSession, registerAccount, signIn } from "../utils/auth";

export default function CreateAccount() {
  const navigate = useNavigate();

  const [redirectHome, setRedirectHome] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [role, setRole] = useState<"parent" | "child">("parent");

  const [statusText, setStatusText] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    document.body.classList.add("auth-page");
    return () => document.body.classList.remove("auth-page");
  }, []);

  useEffect(() => {
    if (getSession()) setRedirectHome(true);
  }, []);

  if (redirectHome) return <Navigate to="/home" replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const safeFullName = fullName.trim();
    const safeUsername = username.trim();

    if (!safeFullName || !safeUsername || !password || !passwordConfirm) {
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
      username: safeUsername,
      password,
      fullName: safeFullName,
      role,
    });

    if (!result.ok) {
      setStatusText(result.message);
      setIsError(true);
      return;
    }

    const loginResult = await signIn(safeUsername, password);
    if (!loginResult.ok) {
      setStatusText(`Account created. Please sign in manually. ${loginResult.message}`);
      setIsError(true);
      return;
    }

    setStatusText("Account created! Entering MediQuest...");
    setIsError(false);

    window.setTimeout(() => {
      navigate("/home");
    }, 250);
  };

  return (
    <>
      <div className="background">
        <div className="glow glow-a"></div>
        <div className="glow glow-b"></div>
        <div className="glow glow-c"></div>
        <div className="noise"></div>
      </div>

      <main className="auth-layout">
        <section className="auth-card">
          <p className="start-screen__eyebrow">MediQuest Registration</p>
          <h1>Create Account</h1>
          <p className="auth-copy">
            Create a Parent or Child account to start tracking quests.
          </p>

          <form id="create-form" className="auth-form" onSubmit={handleSubmit}>
            <label>
              Full Name
              <input
                id="create-full-name"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>

            <label>
              Username
              <input
                id="create-username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>

            <label>
              Password
              <div className="password-input-row">
                <input
                  id="create-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={6}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle-button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <label>
              Confirm Password
              <div className="password-input-row">
                <input
                  id="create-password-confirm"
                  name="passwordConfirm"
                  type={showPasswordConfirm ? "text" : "password"}
                  minLength={6}
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle-button"
                  onClick={() => setShowPasswordConfirm((current) => !current)}
                  aria-label={showPasswordConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showPasswordConfirm ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <label>
              Account Type
              <select
                id="create-role"
                name="role"
                required
                value={role}
                onChange={(e) => setRole(e.target.value as "parent" | "child")}
              >
                <option value="parent">Parent account</option>
                <option value="child">Child account</option>
              </select>
            </label>

            <button className="enter-button" type="submit">
              Create Account
            </button>
          </form>

          <p className={`auth-status ${isError ? "is-error" : ""}`} id="create-status">
            {statusText}
          </p>

          <p className="auth-link-row">
            Already have an account? <Link to="/signin">Back to Sign In</Link>
          </p>

          <p className="auth-link-row">
            <Link to="/">Back to Title Screen</Link>
          </p>
        </section>
      </main>
    </>
  );
}
