import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

export function useGraph() {
  const { instance, accounts } = useMsal();

  async function getToken() {
    if (!accounts[0]) throw new Error("No hay sesión activa");
    const res = await instance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });
    return res.accessToken;
  }

  const user = accounts[0]
    ? {
        nombre: accounts[0].name,
        email: accounts[0].username,
        initials: accounts[0].name
          .split(" ")
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
          .toUpperCase(),
      }
    : null;

  return { getToken, user };
}
