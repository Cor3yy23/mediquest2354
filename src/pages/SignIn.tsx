import { Link, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getSession, signIn } from "../utils/auth";

export default function SignIn() {
  const navigate = useNavigate();

  const [redirectHome, setRedirectHome] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

    const result = await signIn(username, password);

    if (!result.ok) {
      setStatusText(result.message);
      setIsError(true);
      return;
    }

    setStatusText("Success! Entering MediQuest...");
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
          <p className="start-screen__eyebrow">
            MediQuest: By North Oaks Health Systems
          </p>
          <h1>Sign In</h1>
          <p className="auth-copy">
            Use your account to enter the game dashboard.
          </p>

          <form id="signin-form" className="auth-form" onSubmit={handleSubmit}>
            <label>
              Username
              <input
                id="signin-username"
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
                  id="signin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
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

            <p className="auth-note">
              Admin account ready: <strong>admin / admin123</strong>
            </p>

            <button className="enter-button" type="submit">
              Press Enter to Start
            </button>
          </form>

          <p
            className={`auth-status ${isError ? "is-error" : ""}`}
            id="signin-status"
          >
            {statusText}
          </p>

          <p className="auth-link-row">
            Need an account? <Link to="/create-account">Create Account</Link>
          </p>

          <p className="auth-link-row">
            <Link to="/">Back to Title Screen</Link>
          </p>
        </section>
      </main>
    </>
  );
}
