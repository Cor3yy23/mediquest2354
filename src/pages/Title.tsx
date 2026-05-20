import { Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getSession, refreshSessionFromToken } from "../utils/auth";

export default function Title() {
  const [redirectHome, setRedirectHome] = useState(false);

  useEffect(() => {
    document.body.classList.add("title-page");
    return () => {
      document.body.classList.remove("title-page");
    };
  }, []);

  useEffect(() => {
    if (getSession()) {
      setRedirectHome(true);
      return;
    }

    void refreshSessionFromToken().then((session) => {
      if (session) setRedirectHome(true);
    });
  }, []);

  if (redirectHome) return <Navigate to="/home" replace />;

  return (
    <main className="title-screen persona-style">
      <section className="title-screen__left-art" aria-label="MediQuest art">
        <img
          className="title-screen__left-image"
          src="/images/mediquestlogo.png"
          alt="MediQuest"
        />
      </section>

      <section className="title-screen__menu-area">
        <p className="title-screen__kicker">Health habit adventure</p>
        <img className="title-screen__brand-image" src="/images/mediquestlogo.png" alt="MediQuest logo" />
        <h1 className="title-screen__logo">MEDIQUEST</h1>

        <nav className="title-screen__menu" aria-label="Authentication options">
          <Link className="title-screen__menu-item is-active" to="/signin">
            SIGN IN
          </Link>
          <Link className="title-screen__menu-item" to="/create-account">
            REGISTER
          </Link>
        </nav>
      </section>
    </main>
  );
}
