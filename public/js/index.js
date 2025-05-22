document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById("login");
  const signupBtn = document.getElementById("signup");

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "/login";
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener("click", () => {
      window.location.href = "/signup";
    });
  }
});