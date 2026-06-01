import "./style.css";
import {
  InjectedClientProvider,
  RedClient,
  RedUiElement,
  registerRedUiElement,
} from "@reddb-io/ui/embed";

registerRedUiElement();

const host = document.querySelector<RedUiElement>("#red-ui");
const endpointInput = document.querySelector<HTMLInputElement>("#endpoint");
const tokenInput = document.querySelector<HTMLInputElement>("#token");
const mountButton = document.querySelector<HTMLButtonElement>("#mount");

if (!host || !endpointInput || !tokenInput || !mountButton) {
  throw new Error("Embed host DOM is incomplete");
}

const redUiHost = host;
const endpoint = endpointInput;
const token = tokenInput;
const mount = mountButton;

function providerFromHostInputs() {
  const endpointUrl = endpoint.value.trim();
  const authToken = token.value.trim();
  const client = new RedClient(endpointUrl, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });

  return new InjectedClientProvider({
    client,
    connection: {
      id: "host-auth",
      label: "Host-owned auth",
      url: endpointUrl,
      role: "primary",
      description: "ConnectionProvider constructed by the host application.",
    },
  });
}

function mountFromHostAuth() {
  redUiHost.initialRoute = "/collections";
  redUiHost.theme = "dark";
  redUiHost.connectionProvider = providerFromHostInputs();
}

mount.addEventListener("click", mountFromHostAuth);
mountFromHostAuth();
