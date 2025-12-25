import { API_BASE_URL } from "./config.js";

const API_URL = `${API_BASE_URL}/api`;

const loginForm = document.getElementById("loginForm");
const errorText = document.getElementById("error");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorText) {
      errorText.textContent = "";
    }

    const usernameEl = document.getElementById("username");
    const passwordEl = document.getElementById("password");
    const username = usernameEl ? usernameEl.value : "";
    const password = passwordEl ? passwordEl.value : "";

    try {
      // 1. Login
      const res = await fetch(`${API_URL}/token/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Credenciales incorrectas");
      }

      const tokenData = await res.json();
      localStorage.setItem("access", tokenData.access);
      localStorage.setItem("refresh", tokenData.refresh);

      // 2. Obtener perfil
      const profileRes = await fetch(`${API_URL}/accounts/me/`, {
        headers: {
          Authorization: `Bearer ${tokenData.access}`,
        },
      });

      if (!profileRes.ok) {
        throw new Error("No se pudo obtener el perfil");
      }

      const profile = await profileRes.json();

      // 3. Redireccion segun rol
      const roleRedirects = {
        STUDENT: "/alumno/dashboard.html",
        ALUMNO: "/alumno/dashboard.html", // compat legado
        ADMIN: "/coach/dashboard.html",
        ROOT: "/coach/dashboard.html",
      };

      const nextUrl = profile.redirect || roleRedirects[profile.role];
      if (nextUrl) {
        window.location.href = nextUrl;
      } else if (errorText) {
        errorText.textContent = "No hay menu para este usuario";
      }
    } catch (err) {
      if (errorText) {
        errorText.textContent = err.message;
      }
    }
  });
}
